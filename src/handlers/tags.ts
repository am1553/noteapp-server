import { Response, Request } from "express";
import pool from "../db";
export const getTags = async (req: Request, res: Response) => {
  const user = req.locals.user;
  try {
    const tagsQuery = await pool.query(
      "SELECT name, id FROM tags WHERE user_id = $1",
      [user.id]
    );
    return res.status(200).json(tagsQuery.rows);
  } catch (error) {
    return res.status(500).json(error);
  }
};

export const getTag = async (req: Request, res: Response) => {
  const user = req.locals.user;
  const { id } = req.params;
  try {
    const tagQuery = await pool.query("SELECT * FROM tags WHERE id = $1", [id]);
    const tag = tagQuery.rows[0];
    return res.status(200).json(tag);
  } catch (error) {
    return res.status(500).json(error);
  }
};
