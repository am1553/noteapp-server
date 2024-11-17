import { Router } from "express";
import { createNote, getNote, getNotes, updateNote } from "./handlers/notes.js";
import { getTag, getTags } from "./handlers/tags.js";
import {createUser} from "./handlers/users";

const router = Router();


router.post("/notes", createNote);
router.get("/notes/:id", getNote);
router.get("/notes", getNotes);
router.put("/notes/:id", updateNote);
router.get("/tags", getTags);
router.get("/tags/:id", getTag);

router.get("/heartbeat", (req, res) => {
  try {
    return res.status(200).json({ access: true });
  } catch (error) {
    return res.status(401).json({ message: "Token expired." });
  }
});
export default router;
