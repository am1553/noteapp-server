import { Request, Response } from "express";

declare interface AcessRefreshToken {
  access: string;
  refresh: string;
}

declare interface User {
  id?: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}
