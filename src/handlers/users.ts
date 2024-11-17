import { NextFunction, Request, Response } from "express";
import pool from "../db/index";
import {
  comparePasswords,
  createRefreshToken,
  createToken,
  hashPassword,
} from "../modules/auth";
import { AcessRefreshToken, User } from "../types";

type CreateResponseSuccess = {
  token: AcessRefreshToken;
  user: Omit<User, "firstName" | "lastName"> &
    Required<Pick<User, "firstName" | "lastName">>;
};

type CreateResponseError = { message: string };
type CreateResponse = Response<
  CreateResponseSuccess | CreateResponseError,
  any
>;

export const userExists = (email: string) => {
  return pool.query("SELECT * FROM users WHERE (email) = $1", [email]);
};

export const createUser = async (
  req: Request<
    {},
    {},
    Omit<User, "firstName" | "lastName" | "email" | "password"> &
      Required<Pick<User, "firstName" | "lastName" | "password" | "email">>,
    {}
  >,
  res: CreateResponse,
  next: NextFunction
): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;
  try {
    const isValidReq = (await userExists(email)).rows.length === 0;
    if (!isValidReq) {
      res.status(500).json({ message: "User already exists." });
    }
    const hashedPassword = await hashPassword(password);
    const userQuery = await pool.query(
      "INSERT INTO users (email, password, first_name, last_name) VALUES($1, $2, $3, $4) RETURNING email, first_name, last_name",
      [email, hashedPassword, firstName, lastName]
    );

    const user: Omit<User, "firstName" | "lastName" | "email"> &
      Required<Pick<User, "firstName" | "lastName" | "email">> =
      userQuery.rows[0];
    const token: string = createToken(user);
    const refreshToken: string = createRefreshToken(user);
    res.status(201).json({
      token: { access: token, refresh: refreshToken },
      user: user,
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (
  req: Request<{}, {}, { email: string; password: string }, {}>,
  res: Response
) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE (email) = $1",
      [email]
    );

    if (userQuery.rows.length < 1) {
      return res
        .status(401)
        .json({ message: "No user found with the email address." });
    }
    const user = userQuery.rows[0];
    const noteQuery = await pool.query(
      "SELECT id FROM notes WHERE user_id = $1 LIMIT 1",
      [user.id]
    );

    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = createToken(user);
    const refreshToken = createRefreshToken(user);

    const data: { token: Token; user: User; noteID: string | null } = {
      token: { access: token, refresh: refreshToken },
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      noteID: null,
    };

    if (noteQuery.rows.length > 0) {
      data.noteID = noteQuery.rows[0].id;
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json(error);
  }
};
