import { Request, Response } from "express";
import pool from "../db";

export const getSettings = async (req: Request, res: Response) => {
  const user = req.locals.user;
  const settingsQuery = await pool.query(
    "SELECT * FROM settings WHERE user_id = $1",
    [user.id]
  );

  if (settingsQuery.rows.length < 1) {
    await pool.query("INSERT INTO settings (user_id) VALUES ($1) RETURNING *", [
      user.id,
    ]);
  }

  res.status(200).json(settingsQuery.rows[0]);
  return;
};

export const updateSettings = async (
  req: Request<{}, {}, { theme: string; font: string }>,
  res: Response
) => {
  const user = req.locals.user;
  const { theme, font } = req.body;
  try {
    const existingSettings = await pool.query(
      "SELECT theme, font FROM settings WHERE user_id = $1",
      [user.id]
    );
    const data = {
      theme: theme ? theme : existingSettings.rows[0].theme,
      font: font ? font : existingSettings.rows[0].font,
    };
    const settingsQuery = await pool.query(
      "UPDATE settings SET theme = $1, font = $2 WHERE user_id = $3 RETURNING *",
      [data.theme, data.font, user.id]
    );
    res.status(200).json(settingsQuery.rows[0]);
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
    return;
  }
};
