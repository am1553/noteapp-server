import { NextFunction } from "express";
import pool from "../db/index";
import {
  comparePasswords,
  createRefreshToken,
  createToken,
  hashPassword,
} from "../modules/auth";
import {
  AccessRefreshToken,
  CreateUserReq,
  CreateUserRes,
  SignInReq,
  SignInRes,
  User,
} from "../types";

export const userExists = (email: string) => {
  return pool.query("SELECT * FROM users WHERE (email) = $1", [email]);
};

export const createUser = async (
  req: CreateUserReq,
  res: CreateUserRes,
  next: NextFunction
): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const isValidReq = (await userExists(email)).rows.length === 0;
    if (!isValidReq) {
      res.status(500).json({ message: "User already exists." });
    }
    console.log("HASHING PASSWORD...");
    const hashedPassword = await hashPassword(password);

    console.log("QUERYING DATABASE...");
    const userQuery = await pool.query(
      "INSERT INTO users (email, password, first_name, last_name) VALUES($1, $2, $3, $4) RETURNING email, first_name, last_name, id",
      [email, hashedPassword, firstName, lastName]
    );

    console.log("USER CREATED: ", userQuery.rows[0]);
    const user: Omit<User, "firstName" | "lastName" | "email"> &
      Required<Pick<User, "firstName" | "lastName" | "email">> =
      userQuery.rows[0];
    const token: string = createToken(user);
    const refreshToken: string = createRefreshToken(user);
    console.log(user);
    await pool.query("INSERT INTO settings (user_id) VALUES ($1) RETURNING *", [
      user.id,
    ]);

    const data = {
      token: { access: token, refresh: refreshToken },
      user: user,
    };
    res.status(201).json(data);
    return;
  } catch (error) {
    next(error);
  }
};

export const signIn = async (
  req: SignInReq,
  res: SignInRes,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE (email) = $1",
      [email]
    );

    if (userQuery.rows.length < 1) {
      res
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
      res.status(401).json({ message: "Invalid password" });
    }

    const token: string = createToken(user);
    const refreshToken: string = createRefreshToken(user);

    const data: {
      token: AccessRefreshToken;
      user: Omit<User, "firstName" | "lastName" | "id"> &
        Required<Pick<User, "firstName" | "lastName" | "email" | "id">>;
    } = {
      token: { access: token, refresh: refreshToken },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    };
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
