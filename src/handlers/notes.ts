import { NextFunction, Request, Response } from "express";
import pool from "../db";
import { Note, Tag, User } from "../types";

export const removeDuplicateTags = async (
  req: Request<{}, {}, Note & { tags: Tag[] }, {}>,
  res: Response,
  next: NextFunction
) => {
  const { tags } = req.body;
  const filteredTags = tags.filter(
    (tag, index, self) =>
      index ===
      self.findIndex(
        (t) => t.name.toLowerCase().trim() === tag.name.toLowerCase().trim()
      )
  );
  req.body.tags = filteredTags;
  next();
};

const tagExists = async (name: string, userID: string) => {
  const tagQuery = await pool.query(
    "SELECT * FROM tags WHERE name = $1 AND user_id = $2",
    [name, userID]
  );
  if (tagQuery.rows.length > 0) {
    return true;
  }
  return false;
};

export const createTags = async (
  req: Request<{}, {}, Note & { tags: Tag[] }, {}>,
  res: Response,
  next: NextFunction
) => {
  const user = req.locals.user;
  const { tags } = req.body;
  console.log("=========================================================");
  console.log(tags);
  try {
    const newTagsQuery = await Promise.all(
      tags.map(async (tag: Tag) => {
        // if tag exists then return null
        const doesTagExist = await tagExists(tag.name.toLowerCase(), user.id!);
        if (doesTagExist) return null;
        const newTag = await pool.query(
          "INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *",
          [tag.name.toLowerCase(), user.id]
        );
        const createdTag = newTag.rows[0];
        return createdTag;
      })
    );
    next();
  } catch (error) {
    console.log(error);
  }
};

export const createNoteTagJoin = async (
  req: Request,
  res: Response<(Note & { tags: Tag[] }) | any, {}>
) => {
  const data = req.locals.data;
  try {
    data.tags?.map(async (tag: Tag) => {
      const noteID = data.id;
      await pool.query(
        "INSERT INTO note_tags (note_id, tag_id) VALUES($1, $2)",
        [noteID, tag.id]
      );
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const createNote = async (
  req: Request<{}, {}, Note & { tags: Tag[] }>,
  res: Response,
  next: NextFunction
) => {
  const user = req.locals.user as Omit<User, "id"> & Required<Pick<User, "id">>;

  const { title, description, tags } = req.body;

  try {
    const noteQuery = await pool.query(
      "INSERT INTO notes (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, user.id]
    );

    const tagsQuery = await Promise.all(
      tags.map(async (tag) => {
        const tagQuery = await pool.query(
          "SELECT * FROM tags WHERE name = $1",
          [tag.name]
        );
        return tagQuery.rows[0];
      })
    );
    req.locals.data = { ...noteQuery.rows[0], tags: tagsQuery };
    next();
  } catch (error) {
    console.log("FAILED TO CREATE NOTE");
    res.status(500).json({ error });
  }
};

export const getNote = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  try {
    const noteQuery = await pool.query(
      "SELECT id, title, description, is_archived, updated_at FROM notes WHERE id = $1",
      [id]
    );

    const noteTags = await pool.query(
      "SELECT * FROM note_tags WHERE note_id = $1",
      [noteQuery.rows[0].id]
    );

    const tags: Tag[] = await Promise.all(
      noteTags.rows.map(async (noteTag) => {
        const tagQuery = await pool.query("SELECT * FROM tags WHERE id = $1", [
          noteTag.tag_id,
        ]);
        return tagQuery.rows[0];
      })
    );

    const note = noteQuery.rows[0];

    const data = { ...note, tags };
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const getNotes = async (
  req: Request<
    {},
    {},
    {},
    { isArchived?: boolean; tagStr?: string; value?: string }
  >,
  res: Response
) => {
  const { user } = req.locals;
  const { isArchived, tagStr, value } = req.query;

  try {
    let notesDbQuery =
      "SELECT id, title, description, is_archived, updated_at FROM notes WHERE user_id = $1";
    const notesDbParams = [user.id];

    if (isArchived) {
      notesDbQuery += " AND is_archived = $2";
      notesDbParams.push("true");
    }

    const notes = await pool.query(notesDbQuery, notesDbParams);

    const data = await Promise.all(
      notes.rows.map(async (note) => {
        const noteTagsQuery = await pool.query(
          "SELECT * FROM note_tags WHERE note_id = $1",
          [note.id]
        );

        const tags = await Promise.all(
          noteTagsQuery.rows.map(async (noteTag) => {
            const tagQuery = await pool.query(
              "SELECT id, name FROM tags WHERE id = $1",
              [noteTag.tag_id]
            );
            return tagQuery.rows[0];
          })
        );
        return { ...note, tags };
      })
    );

    if (tagStr) {
      const filterbyTag = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (tagNames.includes(tagStr)) {
          return note;
        }
      });

      res.status(200).json(filterbyTag);
    }

    if (value) {
      const filteredData = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (
          note.title.toLowerCase().includes(value.toLowerCase()) ||
          note.description.toLowerCase().includes(value.toLowerCase()) ||
          tagNames.includes(value)
        ) {
          return note;
        }
      });

      res.status(200).json(filteredData);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const updateNote = async (
  req: Request<
    { id: string },
    {},
    {
      title: string;
      description: string;
      isArchived: boolean;
      tags: Tag[];
    }
  >,
  res: Response
) => {
  const { id } = req.params;
  const { title, description, isArchived, tags } = req.body;

  try {
    const noteQuery = await pool.query(
      "UPDATE notes SET title = $1, description = $2, is_archived = $3, WHERE id = $4",
      [title, description, isArchived, id]
    );
    const noteTags = await pool.query(
      "SELECT * FROM note_tags WHERE note_id = $1",
      [id]
    );

    const newTags = tags.filter((tag: Tag) => {
      if (!tag.id) return tag;
    });
    const newTagsQuery: Tag[] = await Promise.all(
      newTags.map(async (tag: Tag) => {
        const newTagQuery = await pool.query(
          "INSERT INTO tags (name) VALUES ($1) RETURNING *",
          [tag]
        );
        return newTagQuery.rows[0];
      })
    );

    const newNoteTags = await Promise.all(
      newTagsQuery.map(async (tag: Tag) => {
        const noteTagQuery = await pool.query(
          "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) RETURNING *",
          [id, tag.id]
        );

        return noteTagQuery.rows[0];
      })
    );

    const tagsQuery = Promise.all(tags.map((tag: Tag) => {}));
  } catch (error) {
    console.error(error);
  }
};

export const deleteNote = async (
  req: Request<{ id: string }>,
  res: Response<{ message: string }, { message: string }>
) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM notes WHERE id = $1", [id]);
    const notesQuery = await pool.query("SELECT * FROM notes");
    const data = notesQuery.rows.map(async (note) => {
      const noteTagsQuery = await pool.query(
        "SELECT tag_id FROM note_tags WHERE note_id = $1",
        [note.id]
      );
      const noteTags = noteTagsQuery.rows.map((notetag) => notetag.tag_id);
      const tagsQuery = await Promise.all(
        noteTags.map(async (tagID) => {
          const tags = await pool.query("SELECT * FROM tags WHERE id = $1", [
            tagID,
          ]);
          return tags.rows[0];
        })
      );
      return { ...note, tags: tagsQuery };
    });
    res.status(200).json({ message: "Deleted Successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note." });
  }
};
