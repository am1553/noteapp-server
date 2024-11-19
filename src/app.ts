import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import pool from "./db/index";
import morgan from "morgan";
import { protect } from "./modules/auth";
import { appRouter, authRouter } from "./router";

const app: Express = express();
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://notesapp-react-akzo.onrender.com/*",
  ],
  method: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());

const testDatabaseConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await pool.query("SELECT 1");
    console.log("CONNECTED TO DB...");
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
};

app.use(testDatabaseConnection);

app.use("/auth", authRouter);
app.use("/api/v1", protect, appRouter);

export default app;
