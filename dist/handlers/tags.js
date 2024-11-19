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
exports.deleteRemovedTags = exports.createTags = exports.removeDuplicateTags = exports.getTag = exports.getTags = exports.validateTagData = void 0;
const db_1 = __importDefault(require("../db"));
const validateTagData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { tags } = req.body;
    const formattedTags = tags
        .filter((tag) => {
        if (tag && tag.name.trim() !== "")
            return tag;
    })
        .map((tag) => (Object.assign(Object.assign({}, tag), { name: tag.name.toLowerCase().trim() })));
    console.log(formattedTags);
    req.body.tags = formattedTags;
    next();
});
exports.validateTagData = validateTagData;
const getTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.locals.user;
    try {
        const tagsQuery = yield db_1.default.query("SELECT name, id FROM tags WHERE user_id = $1", [user.id]);
        res.status(200).json(tagsQuery.rows);
    }
    catch (error) {
        res.status(500).json(error);
    }
});
exports.getTags = getTags;
const getTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const tagQuery = yield db_1.default.query("SELECT * FROM tags WHERE id = $1", [id]);
        const tag = tagQuery.rows[0];
        res.status(200).json(tag);
    }
    catch (error) {
        res.status(500).json(error);
    }
});
exports.getTag = getTag;
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
            const doesTagExist = yield tagExists(tag.name.toLowerCase(), user.id);
            if (doesTagExist)
                return null;
            const newTag = yield db_1.default.query("INSERT INTO tags (name, user_id) VALUES ($1, $2) RETURNING *", [tag.name.toLowerCase(), user.id]);
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
const deleteRemovedTags = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { tags, id: noteID } = req.body;
    try {
        const prevState = yield db_1.default.query("SELECT name, id FROM tags INNER JOIN note_tags ON tags.id = note_tags.tag_id WHERE note_id = $1", [noteID]);
        const bodyTagNames = tags.map((tag) => tag.name);
        const removedTags = prevState.rows.filter((row) => {
            if (!bodyTagNames.includes(row.name))
                return row;
        });
        yield Promise.all(removedTags.map((tag) => __awaiter(void 0, void 0, void 0, function* () {
            return yield db_1.default.query("DELETE FROM tags WHERE id = $1", [tag.id]);
        })));
        next();
        return;
    }
    catch (error) {
        console.log(error);
        res.status(500).json(error);
        return;
    }
});
exports.deleteRemovedTags = deleteRemovedTags;
