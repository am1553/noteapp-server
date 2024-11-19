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
exports.signIn = exports.createUser = exports.userExists = void 0;
const index_1 = __importDefault(require("../db/index"));
const auth_1 = require("../modules/auth");
const userExists = (email) => {
    return index_1.default.query("SELECT * FROM users WHERE (email) = $1", [email]);
};
exports.userExists = userExists;
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, firstName, lastName } = req.body;
    console.log(req.body);
    try {
        const isValidReq = (yield (0, exports.userExists)(email)).rows.length === 0;
        if (!isValidReq) {
            res.status(500).json({ message: "User already exists." });
        }
        const hashedPassword = yield (0, auth_1.hashPassword)(password);
        const userQuery = yield index_1.default.query("INSERT INTO users (email, password, first_name, last_name) VALUES($1, $2, $3, $4) RETURNING email, first_name, last_name", [email, hashedPassword, firstName, lastName]);
        const user = userQuery.rows[0];
        const token = (0, auth_1.createToken)(user);
        const refreshToken = (0, auth_1.createRefreshToken)(user);
        yield index_1.default.query("INSERT INTO settings (user_id) VALUES ($1) RETURNING *", [
            user.id,
        ]);
        const data = {
            token: { access: token, refresh: refreshToken },
            user: user,
        };
        res.status(201).json(data);
    }
    catch (error) {
        next(error);
    }
});
exports.createUser = createUser;
const signIn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const userQuery = yield index_1.default.query("SELECT * FROM users WHERE (email) = $1", [email]);
        if (userQuery.rows.length < 1) {
            res
                .status(401)
                .json({ message: "No user found with the email address." });
        }
        const user = userQuery.rows[0];
        const noteQuery = yield index_1.default.query("SELECT id FROM notes WHERE user_id = $1 LIMIT 1", [user.id]);
        const isValidPassword = yield (0, auth_1.comparePasswords)(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: "Invalid password" });
        }
        const token = (0, auth_1.createToken)(user);
        const refreshToken = (0, auth_1.createRefreshToken)(user);
        const data = {
            token: { access: token, refresh: refreshToken },
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
            },
        };
        res.status(200).json(data);
    }
    catch (error) {
        next(error);
    }
});
exports.signIn = signIn;
