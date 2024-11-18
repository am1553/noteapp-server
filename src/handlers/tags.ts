import { Response, Request, NextFunction } from "express";
import pool from "../db";
import { Note, Tag } from "../types";

export const validateTagData = async (
  req: Request<{}, {}, Note & { tags: Tag[] }, {}>,
  res: Response,
  next: NextFunction
) => {
  const { tags } = req.body;
  const formattedTags = tags.map((tag) => ({
    ...tag,
    name: tag.name.toLowerCase().trim(),
  }));

  req.body.tags = formattedTags;
  next();
};

export const getTags = async (req: Request, res: Response) => {
  const user = req.locals.user;
  try {
    const tagsQuery = await pool.query(
      "SELECT name, id FROM tags WHERE user_id = $1",
      [user.id]
    );
    res.status(200).json(tagsQuery.rows);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const getTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tagQuery = await pool.query("SELECT * FROM tags WHERE id = $1", [id]);
    const tag = tagQuery.rows[0];
    res.status(200).json(tag);
  } catch (error) {
    res.status(500).json(error);
  }
};

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
    res.status(500).json(error);
  }
};
