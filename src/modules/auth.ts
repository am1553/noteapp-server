import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Response, Request, NextFunction } from "express";
import { User } from "../types";
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

const verifyToken = (token: string): { user: User } => {
  const jwtSecret: string = process.env.JWT_SECRET as string;
  return jwt.verify(token, jwtSecret) as { user: User };
};

export const issueNewToken = (
  req: Request<{}, {}, { refreshToken: string }>,
  res: Response<{ access: string } | { message: string }>,
  next: NextFunction
) => {
  const refreshToken = req.body.refreshToken;

  try {
    if (!refreshToken)
      res.status(401).json({ message: "Refresh token is required." });

    const isValid = !!verifyToken(refreshToken);
    if (!isValid) res.status(403).json({ message: "Invalid refresh token." });

    const verifiedToken = verifyToken(refreshToken);
    const newToken = createToken(verifiedToken.user);
    res.status(200).json({ access: newToken });
  } catch (error) {
    next(error);
  }
};

export const protect = (
  req: Request<{}, {}, {}, {}, { locals: { user: User } }>,
  res: Response,
  next: NextFunction
): void => {
  const bearer: null | undefined | string = req.headers.authorization;

  try {
    if (!bearer) {
      res.status(401).json({ message: "Not Authorized." });
    } else {
      const [, token] = bearer.split(" ");
      if (!token) {
        res.status(401);
        res.json({ message: "Invalid Token." });
      }

      const payload = verifyToken(token);
      const { user } = payload;
      req.locals = { user };
      next();
    }
  } catch (error) {
    res.status(401).json({ message: "Failed to verify token." });
  }
};
