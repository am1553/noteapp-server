import { Response } from "express";
import pool from "../db";
import { AuthenticatedRequest, Note, Tag } from "../types";

export const createNote = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { title, description, tags } = req.body;
  try {
    const noteQuery = await pool.query(
      "INSERT INTO notes (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, user.id]
    );
    const tagsQuery = await Promise.all(
      tags.map(async (tag: Tag) => {
        const tagQuery = await pool.query(
          "INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *",
          [tag.name.toLowerCase(), user.id]
        );
        await pool.query(
          "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
          [noteQuery.rows[0].id, tagQuery.rows[0].id]
        );
        return tagQuery.rows[0];
      })
    );

    const data = { ...noteQuery.rows[0], tags: tagsQuery };
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error });
  }
};

export const getNote = async (req: AuthenticatedRequest, res: Response) => {
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

    const tags = await Promise.all(
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

export const getNotes = async (req: AuthenticatedRequest, res: Response) => {
  const { user, query } = req;

  try {
    let notesDbQuery =
      "SELECT id, title, description, is_archived, updated_at FROM notes WHERE user_id = $1";
    const notesDbParams = [user.id];

    if (query.isArchived) {
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

    if (query.tag) {
      const filterbyTag = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (tagNames.includes(query.tag)) {
          return note;
        }
      });

      return res.status(200).json(filterbyTag);
    }

    if (query.searchAll) {
      const searchValue = query.value as string;

      const filteredData = data.filter((note) => {
        const noteTags = note.tags;
        const tagNames = noteTags.map((tag: Tag) => tag.name);
        if (
          note.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          note.description.toLowerCase().includes(searchValue.toLowerCase()) ||
          tagNames.includes(searchValue)
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

const createNoteTagJoin = async (noteID: string, tagID: string) => {
  const noteTagsQuery = await pool.query(
    "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
    [noteID, tagID]
  );
};

const createNoteWithTags = async (noteData: Note, tagsData: Tag[]) => {};

export const updateNote = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, is_archived, tags } = req.body;

  try {
    const noteQuery = await pool.query(
      "UPDATE notes SET title = $1, description = $2, is_archived = $3, WHERE id = $4",
      [title, description, is_archived, id]
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
