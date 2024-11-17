import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Response } from "express";
import { AuthenticatedRequest, User } from "../types";
export const comparePasswords = (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const createToken = (user: User): string => {
  const jwtSecret: string = process.env.JWT_SECRET as string;
  const token = jwt.sign({ user }, jwtSecret, {
    expiresIn: "1d",
  });
  return token;
};

export const createRefreshToken = (user: User): string => {
  const jwtSecret: string = process.env.JWT_SECRET as string;
  const token = jwt.sign({ user }, jwtSecret, {
    expiresIn: "7days",
  });
  return token;
};

const verifyToken = (token: string): string | JwtPayload => {
  const jwtSecret: string = process.env.JWT_SECRET as string;
  return jwt.verify(token, jwtSecret);
};

export const issueNewToken = (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken)
    res.status(401).json({ message: "Refresh token is required." });

  const isValid = !!verifyToken(refreshToken);
  if (!isValid) res.status(403).json({ message: "Invalid refresh token." });

  const verifiedToken = verifyToken(refreshToken);
  const newToken = createToken(verifiedToken.user);
  return res.status(200).json({ access: newToken });
};

export const protect = (req, res, next) => {
  const bearer = req.headers.authorization;

  if (!bearer) {
    res.status(401);
    return res.json({ message: "Not Authorized." });
  }

  const [, token] = bearer.split(" ");
  if (!token) {
    res.status(401);
    return res.json({ message: "Invalid Token." });
  }

  try {
    const payload = verifyToken(token);
    const { user } = payload;
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Failed to verify token." });
  }
};
