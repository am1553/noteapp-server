import { Request, Response } from "express";
import pool from "../db";
import { Tag, User } from "../types";

const createTag = async (name: string, userID: string) => {
  return await pool.query(
    "INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *",
    [name, userID]
  );
};

const createNoteTagJoin = async (noteID: string, tagID: string) => {
  await pool.query("INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)", [
    noteID,
    tagID,
  ]);
};

export const createNote = async (
  req: Request<
    {},
    {},
    { title: string; description: string; tags: string[] },
    {}
  >,
  res: Response
) => {
  const user = req.locals.user as Omit<User, "id"> & Required<Pick<User, "id">>;

  const { title, description, tags } = req.body;
  try {
    const noteQuery = await pool.query(
      "INSERT INTO notes (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, user.id]
    );
    const tagsQuery = await Promise.all(
      tags.map(async (tagStr: string) => {
        const tagQuery = await createTag(tagStr, user.id!);
        const tag: Omit<Tag, "id"> & Required<Pick<Tag, "id">> =
          tagQuery.rows[0];
        createNoteTagJoin(tag.id, user.id);
        return tag;
      })
    );

    const data = { ...noteQuery.rows[0], tags: tagsQuery };
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error });
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
        console.log(noteTag);
        const tagQuery = await pool.query("SELECT * FROM tags WHERE id = $1", [
          noteTag.tag_id,
        ]);
        return tagQuery.rows[0];
      })
    );

    const note = noteQuery.rows[0];

    const data = { ...note, tags };
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error });
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

      return res.status(200).json(filterbyTag);
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

      return res.status(200).json(filteredData);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error });
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
    const newTagsQuery = await Promise.all(
      newTags.map(async (tag: Tag) => {
        const newTagQuery = await pool.query(
          "INSERT INTO tags (name) VALUES ($1) RETURNING *",
          [tag]
        );
        return newTagQuery.rows;
      })
    );

    const newNoteTags = await Promise.all(
      newTagsQuery.map(async (tag) => {
        const noteTagQuery = await pool.query(
          "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) RETURNING *",
          [id, tag.id]
        );

        return noteTagQuery.rows[0];
      })
    );

    const tagsQuery = Promise.all(tags.map((tag: Tag) => {}));
  } catch (error) {}
};
