import { Request, Response } from "express";

export interface AccessRefreshToken {
  access: string;
  refresh: string;
}

export interface User {
  id?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export type CreateUserReq = Request<
  {},
  {},
  Omit<User, "firstName" | "lastName" | "email" | "password"> &
    Required<Pick<User, "firstName" | "lastName" | "password" | "email">>,
  {}
>;

export type CreateUserRes = Response<
  | {
      token: AccessRefreshToken;
      user: Omit<User, "firstName" | "lastName"> &
        Required<Pick<User, "firstName" | "lastName">>;
    }
  | { message: string },
  any
>;

export type SignInReq = Request<
  {},
  {},
  { email: string; password: string },
  {}
>;
export type SignInRes = Response<
  | {
      token: AccessRefreshToken;
      user: Omit<User, "firstName" | "lastName" | "id"> &
        Required<Pick<User, "firstName" | "lastName" | "email" | "id">>;
    }
  | { message: string }
>;

declare global {
  namespace Express {
    interface Request {
      locals: {
        user: User;
        data?: any;
      };
    }
  }
}

export interface Note {
  id?: string;
  title: string;
  description?: string;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
  userID?: string;
}

export interface Tag {
  id?: string;
  name: string;
  userID?: string;
}
