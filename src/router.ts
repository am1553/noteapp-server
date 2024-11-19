import { Request, Response, Router } from "express";
import {
  createNote,
  createNoteTagJoin,
  deleteNote,
  getNote,
  getNotes,
  updateNote,
} from "./handlers/notes";
import {
  createTags,
  getTag,
  getTags,
  removeDuplicateTags,
  validateTagData,
  deleteRemovedTags,
} from "./handlers/tags";
import { createUser, signIn } from "./handlers/users";
import { issueNewToken } from "./modules/auth";
import { getSettings, updateSettings } from "./handlers/settings";

const appRouter: Router = Router();
const authRouter: Router = Router();

appRouter.post(
  "/notes",
  validateTagData,
  removeDuplicateTags,
  createTags,
  createNote,
  createNoteTagJoin
);
appRouter.get("/notes/:id", getNote);
appRouter.get("/notes", getNotes);
appRouter.put(
  "/notes/:id",
  validateTagData,
  removeDuplicateTags,
  deleteRemovedTags,
  createTags,
  updateNote,
  createNoteTagJoin
);
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

appRouter.get("/settings", getSettings);
appRouter.put("/settings", updateSettings);

authRouter.post("/users", createUser);
authRouter.post("/sign-in", signIn);
authRouter.post("/refresh-token", issueNewToken);

export { appRouter, authRouter };
