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
  try {
    await Promise.all(
      tags.map(async (tag: Tag) => {
        // if tag exists then return null
        const doesTagExist = await tagExists(
          tag.name.trim().toLowerCase(),
          user.id!
        );
        if (doesTagExist) return null;
        const newTag = await pool.query(
          "INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *",
          [tag.name.trim().toLowerCase(), user.id]
        );
        const createdTag = newTag.rows[0];
        return createdTag;
      })
    );
    next();
  } catch (error) {
    res.status(500).json(error);
  }
};

export const createNoteTagJoin = async (
  req: Request,
  res: Response<(Note & { tags: Tag[] }) | any, {}>
) => {
  const data = req.locals.data;

  try {
    const existingNoteTags = await pool.query(
      "SELECT tag_id FROM note_tags WHERE note_id = $1",
      [data.id]
    );
    const tagIDs = existingNoteTags.rows.map((row) => row.tag_id);
    const existingTags = await Promise.all(
      tagIDs.map(async (tagID) => {
        const data = await pool.query("SELECT * FROM tags WHERE id = $1", [
          tagID,
        ]);
        return data.rows[0];
      })
    );
    const existingTagNames = existingTags.map((tag) => {
      if (tag) {
        return tag.name;
      }
    });
    const newJoins = data.tags.filter(
      (tag: Tag) => !existingTagNames.includes(tag.name)
    );
    newJoins.map(async (tag: Tag) => {
      const noteID = data.id;
      await pool.query(
        "INSERT INTO note_tags (note_id, tag_id) VALUES($1, $2)",
        [noteID, tag.id]
      );
    });

    res.status(200).json(data);
    return;
  } catch (error) {
    console.log(error);
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

    const formatData = {
      id: note.id,
      title: note.title,
      description: note.description,
      isArchived: note.is_archived,
      updatedAt: note.updated_at,
      tags,
    };
    res.status(200).json(formatData);
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const getNotes = async (
  req: Request<
    {},
    {},
    {},
    {
      isArchived?: string;
      searchValue?: string;
      tagName?: string;
    }
  >,
  res: Response
): Promise<void> => {
  const { user } = req.locals;
  const { isArchived, searchValue, tagName } = req.query;

  try {
    let notesDbQuery =
      "SELECT id, title, description, is_archived, updated_at FROM notes WHERE user_id = $1";
    const notesDbParams = [user.id];

    if (isArchived === "true") {
      notesDbQuery += " AND is_archived = $2";
      notesDbParams.push("true");
    } else if (isArchived === "false") {
      notesDbQuery += " AND is_archived = $2";
      notesDbParams.push("false");
    } else {
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
        const noteData: Note = {
          id: note.id,
          title: note.title,
          description: note.description,
          isArchived: note.is_archived,
          updatedAt: note.updated_at,
        };
        return { ...noteData, tags: tags.filter((tag) => tag) };
      })
    );

    if (tagName && tagName.trim() !== "") {
      const filteredData = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (tagNames.includes(tagName)) {
          return note;
        }
      });
      res.status(200).json(filteredData);
      return;
    }

    if (searchValue === "") {
      res.status(200).json(data);
      return;
    }

    if (searchValue) {
      const filteredData = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (
          note.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          note.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
          tagNames.includes(searchValue)
        ) {
          return note;
        }
      });
      res.status(200).json(filteredData);
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const updateNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { title, description, isArchived, tags } = req.body;
  try {
    const noteQuery = await pool.query(
      "UPDATE notes SET title = $1, description = $2, is_archived = $3 WHERE id = $4 RETURNING *",
      [title, description, isArchived, id]
    );
    const tagsQuery = await Promise.all(
      tags.map(async (tag: Tag) => {
        const tagQuery = await pool.query(
          "SELECT * FROM tags WHERE name = $1",
          [tag.name]
        );
        return tagQuery.rows[0];
      })
    );
    const note = noteQuery.rows[0];

    const noteData = {
      id: note.id,
      title: note.title,
      description: note.description,
      isArchived: note.is_archived,
      updatedAt: note.updated_at,
      tags: tagsQuery,
    };
    req.locals.data = noteData;
    next();
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
    return;
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
      return {
        id: note.id,
        title: note.title,
        description: note.description,
        isArchived: note.is_archived,
        updatedAt: note.updated_at,
        tags: tagsQuery,
      };
    });
    res.status(200).json({ message: "Deleted Successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note." });
  }
};
