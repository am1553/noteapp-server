import { Request, Response, Router } from "express";
import {
  createNote,
  createNoteTagJoin,
  createTags,
  deleteNote,
  getNote,
  getNotes,
  removeDuplicateTags,
  updateNote,
} from "./handlers/notes";
import { getTag, getTags } from "./handlers/tags";
import { createUser, signIn } from "./handlers/users";
import { issueNewToken } from "./modules/auth";

const appRouter: Router = Router();
const authRouter: Router = Router();

appRouter.post(
  "/notes",
  removeDuplicateTags,
  createTags,
  createNote,
  createNoteTagJoin
);
appRouter.get("/notes/:id", getNote);
appRouter.get("/notes", getNotes);
appRouter.put("/notes/:id", updateNote);
appRouter.delete("/notes/:id", deleteNote);
appRouter.get("/tags", getTags);
appRouter.get("/tags/:id", getTag);
appRouter.get(
  "/health",
  (req: Request<{}, {}, {}, {}>, res: Response<{}, { message: string }>) => {
    try {
      res.status(200).json({ access: true });
    } catch (error) {
      res.status(401).json({ message: "Token expired." });
    }
  }
);

authRouter.post("/users", createUser);
authRouter.post("/sign-in", signIn);
authRouter.post("/refresh-token", issueNewToken);

export { appRouter, authRouter };
