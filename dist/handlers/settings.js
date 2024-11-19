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
exports.updateSettings = exports.getSettings = void 0;
const db_1 = __importDefault(require("../db"));
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.locals.user;
    const settingsQuery = yield db_1.default.query("SELECT * FROM settings WHERE user_id = $1", [user.id]);
    if (settingsQuery.rows.length < 1) {
        yield db_1.default.query("INSERT INTO settings (user_id) VALUES ($1) RETURNING *", [
            user.id,
        ]);
    }
    res.status(200).json(settingsQuery.rows[0]);
    return;
});
exports.getSettings = getSettings;
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.locals.user;
    const { theme, font } = req.body;
    try {
        const existingSettings = yield db_1.default.query("SELECT theme, font FROM settings WHERE user_id = $1", [user.id]);
        const data = {
            theme: theme ? theme : existingSettings.rows[0].theme,
            font: font ? font : existingSettings.rows[0].font,
        };
        const settingsQuery = yield db_1.default.query("UPDATE settings SET theme = $1, font = $2 WHERE user_id = $3 RETURNING *", [data.theme, data.font, user.id]);
        res.status(200).json(settingsQuery.rows[0]);
        return;
    }
    catch (error) {
        console.error(error);
        res.status(500).json(error);
        return;
    }
});
exports.updateSettings = updateSettings;
