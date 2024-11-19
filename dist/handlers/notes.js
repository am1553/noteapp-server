"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNote = exports.updateNote = exports.getNotes = exports.getNote = exports.createNote = exports.createNoteTagJoin = exports.createTags = exports.removeDuplicateTags = void 0;
const db_1 = __importDefault(require("../db"));
const removeDuplicateTags = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { tags } = req.body;
    const filteredTags = tags.filter((tag, index, self) => index ===
        self.findIndex((t) => t.name.toLowerCase().trim() === tag.name.toLowerCase().trim()));
    req.body.tags = filteredTags;
    next();
});
exports.removeDuplicateTags = removeDuplicateTags;
const tagExists = (name, userID) => __awaiter(void 0, void 0, void 0, function* () {
    const tagQuery = yield db_1.default.query("SELECT * FROM tags WHERE name = $1 AND user_id = $2", [name, userID]);
    if (tagQuery.rows.length > 0) {
        return true;
    }
    return false;
});
const createTags = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.locals.user;
    const { tags } = req.body;
    try {
        yield Promise.all(tags.map((tag) => __awaiter(void 0, void 0, void 0, function* () {
            // if tag exists then return null
            const doesTagExist = yield tagExists(tag.name.trim().toLowerCase(), user.id);
            if (doesTagExist)
                return null;
            const newTag = yield db_1.default.query("INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *", [tag.name.trim().toLowerCase(), user.id]);
            const createdTag = newTag.rows[0];
            return createdTag;
        })));
        next();
    }
    catch (error) {
        res.status(500).json(error);
    }
});
exports.createTags = createTags;
const createNoteTagJoin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.locals.data;
    try {
        const existingNoteTags = yield db_1.default.query("SELECT tag_id FROM note_tags WHERE note_id = $1", [data.id]);
        const tagIDs = existingNoteTags.rows.map((row) => row.tag_id);
        const existingTags = yield Promise.all(tagIDs.map((tagID) => __awaiter(void 0, void 0, void 0, function* () {
            const data = yield db_1.default.query("SELECT * FROM tags WHERE id = $1", [
                tagID,
            ]);
            return data.rows[0];
        })));
        const existingTagNames = existingTags.map((tag) => {
            if (tag) {
                return tag.name;
            }
        });
        const newJoins = data.tags.filter((tag) => !existingTagNames.includes(tag.name));
        newJoins.map((tag) => __awaiter(void 0, void 0, void 0, function* () {
            const noteID = data.id;
            yield db_1.default.query("INSERT INTO note_tags (note_id, tag_id) VALUES($1, $2)", [noteID, tag.id]);
        }));
        res.status(200).json(data);
        return;
    }
    catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
});
exports.createNoteTagJoin = createNoteTagJoin;
const createNote = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.locals.user;
    const { title, description, tags } = req.body;
    try {
        const noteQuery = yield db_1.default.query("INSERT INTO notes (title, description, user_id) VALUES ($1, $2, $3) RETURNING *", [title, description, user.id]);
        const tagsQuery = yield Promise.all(tags.map((tag) => __awaiter(void 0, void 0, void 0, function* () {
            const tagQuery = yield db_1.default.query("SELECT * FROM tags WHERE name = $1", [tag.name]);
            return tagQuery.rows[0];
        })));
        req.locals.data = Object.assign(Object.assign({}, noteQuery.rows[0]), { tags: tagsQuery });
        next();
    }
    catch (error) {
        console.log("FAILED TO CREATE NOTE");
        res.status(500).json({ error });
    }
});
exports.createNote = createNote;
const getNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const noteQuery = yield db_1.default.query("SELECT id, title, description, is_archived, updated_at FROM notes WHERE id = $1", [id]);
        const noteTags = yield db_1.default.query("SELECT * FROM note_tags WHERE note_id = $1", [noteQuery.rows[0].id]);
        const tags = yield Promise.all(noteTags.rows.map((noteTag) => __awaiter(void 0, void 0, void 0, function* () {
            const tagQuery = yield db_1.default.query("SELECT * FROM tags WHERE id = $1", [
                noteTag.tag_id,
            ]);
            return tagQuery.rows[0];
        })));
        const note = noteQuery.rows[0];
        const formatData = {
            id: note.id,
            title: note.title,
            description: note.description,
            isArchived: note.is_archived,
            updatedAt: note.updated_at,
            tags,
        };
        res.status(200).json(formatData);
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
exports.getNote = getNote;
const getNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = req.locals;
    const { isArchived, searchValue, tagName } = req.query;
    try {
        let notesDbQuery = "SELECT id, title, description, is_archived, updated_at FROM notes WHERE user_id = $1";
        const notesDbParams = [user.id];
        if (isArchived === "true") {
            notesDbQuery += " AND is_archived = $2";
            notesDbParams.push("true");
        }
        else if (isArchived === "false") {
            notesDbQuery += " AND is_archived = $2";
            notesDbParams.push("false");
        }
        else {
        }
        const notes = yield db_1.default.query(notesDbQuery, notesDbParams);
        const data = yield Promise.all(notes.rows.map((note) => __awaiter(void 0, void 0, void 0, function* () {
            const noteTagsQuery = yield db_1.default.query("SELECT * FROM note_tags WHERE note_id = $1", [note.id]);
            const tags = yield Promise.all(noteTagsQuery.rows.map((noteTag) => __awaiter(void 0, void 0, void 0, function* () {
                const tagQuery = yield db_1.default.query("SELECT id, name FROM tags WHERE id = $1", [noteTag.tag_id]);
                return tagQuery.rows[0];
            })));
            const noteData = {
                id: note.id,
                title: note.title,
                description: note.description,
                isArchived: note.is_archived,
                updatedAt: note.updated_at,
            };
            return Object.assign(Object.assign({}, noteData), { tags: tags.filter((tag) => tag) });
        })));
        if (tagName && tagName.trim() !== "") {
            const filteredData = data.filter((note) => {
                const noteTags = note.tags;
                const tagNames = noteTags.map((tag) => tag.name);
                if (tagNames.includes(tagName)) {
                    return note;
                }
            });
            res.status(200).json(filteredData);
            return;
        }
        if (searchValue === "") {
            res.status(200).json(data);
            return;
        }
        if (searchValue) {
            const filteredData = data.filter((note) => {
                var _a;
                const noteTags = note.tags;
                const tagNames = noteTags.map((tag) => tag.name);
                if (note.title.toLowerCase().includes(searchValue.toLowerCase()) ||
                    ((_a = note.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchValue.toLowerCase())) ||
                    tagNames.includes(searchValue)) {
                    return note;
                }
            });
            res.status(200).json(filteredData);
            return;
        }
        res.status(200).json(data);
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
exports.getNotes = getNotes;
const updateNote = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, description, isArchived, tags } = req.body;
    try {
        const noteQuery = yield db_1.default.query("UPDATE notes SET title = $1, description = $2, is_archived = $3 WHERE id = $4 RETURNING *", [title, description, isArchived, id]);
        const tagsQuery = yield Promise.all(tags.map((tag) => __awaiter(void 0, void 0, void 0, function* () {
            const tagQuery = yield db_1.default.query("SELECT * FROM tags WHERE name = $1", [tag.name]);
            return tagQuery.rows[0];
        })));
        const note = noteQuery.rows[0];
        const noteData = {
            id: note.id,
            title: note.title,
            description: note.description,
            isArchived: note.is_archived,
            updatedAt: note.updated_at,
            tags: tagsQuery,
        };
        req.locals.data = noteData;
        next();
        return;
    }
    catch (error) {
        console.error(error);
        res.status(500).json(error);
        return;
    }
});
exports.updateNote = updateNote;
const deleteNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield db_1.default.query("DELETE FROM notes WHERE id = $1", [id]);
        const notesQuery = yield db_1.default.query("SELECT * FROM notes");
        const data = notesQuery.rows.map((note) => __awaiter(void 0, void 0, void 0, function* () {
            const noteTagsQuery = yield db_1.default.query("SELECT tag_id FROM note_tags WHERE note_id = $1", [note.id]);
            const noteTags = noteTagsQuery.rows.map((notetag) => notetag.tag_id);
            const tagsQuery = yield Promise.all(noteTags.map((tagID) => __awaiter(void 0, void 0, void 0, function* () {
                const tags = yield db_1.default.query("SELECT * FROM tags WHERE id = $1", [
                    tagID,
                ]);
                return tags.rows[0];
            })));
            return {
                id: note.id,
                title: note.title,
                description: note.description,
                isArchived: note.is_archived,
                updatedAt: note.updated_at,
                tags: tagsQuery,
            };
        }));
        res.status(200).json({ message: "Deleted Successfully." });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete note." });
    }
});
exports.deleteNote = deleteNote;
