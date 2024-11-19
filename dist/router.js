"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = exports.appRouter = void 0;
const express_1 = require("express");
const notes_1 = require("./handlers/notes");
const tags_1 = require("./handlers/tags");
const users_1 = require("./handlers/users");
const auth_1 = require("./modules/auth");
const settings_1 = require("./handlers/settings");
const appRouter = (0, express_1.Router)();
exports.appRouter = appRouter;
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
appRouter.post("/notes", tags_1.validateTagData, tags_1.removeDuplicateTags, tags_1.createTags, notes_1.createNote, notes_1.createNoteTagJoin);
appRouter.get("/notes/:id", notes_1.getNote);
appRouter.get("/notes", notes_1.getNotes);
appRouter.put("/notes/:id", tags_1.validateTagData, tags_1.removeDuplicateTags, tags_1.deleteRemovedTags, tags_1.createTags, notes_1.updateNote, notes_1.createNoteTagJoin);
appRouter.delete("/notes/:id", notes_1.deleteNote);
appRouter.get("/tags", tags_1.getTags);
appRouter.get("/tags/:id", tags_1.getTag);
appRouter.get("/health", (req, res) => {
    try {
        res.status(200).json({ access: true });
    }
    catch (error) {
        res.status(401).json({ message: "Token expired." });
    }
});
appRouter.get("/settings", settings_1.getSettings);
appRouter.put("/settings", settings_1.updateSettings);
authRouter.post("/users", users_1.createUser);
authRouter.post("/sign-in", users_1.signIn);
authRouter.post("/refresh-token", auth_1.issueNewToken);
