"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.issueNewToken = exports.createRefreshToken = exports.createToken = exports.hashPassword = exports.comparePasswords = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const comparePasswords = (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePasswords = comparePasswords;
const hashPassword = (password) => {
    return bcryptjs_1.default.hash(password, 10);
};
exports.hashPassword = hashPassword;
const createToken = (user) => {
    const jwtSecret = process.env.JWT_SECRET;
    const token = jsonwebtoken_1.default.sign({ user }, jwtSecret, {
        expiresIn: "1d",
    });
    return token;
};
exports.createToken = createToken;
const createRefreshToken = (user) => {
    const jwtSecret = process.env.JWT_SECRET;
    const token = jsonwebtoken_1.default.sign({ user }, jwtSecret, {
        expiresIn: "7days",
    });
    return token;
};
exports.createRefreshToken = createRefreshToken;
const verifyToken = (token) => {
    const jwtSecret = process.env.JWT_SECRET;
    return jsonwebtoken_1.default.verify(token, jwtSecret);
};
const issueNewToken = (req, res, next) => {
    const refreshToken = req.body.refreshToken;
    try {
        if (!refreshToken)
            res.status(401).json({ message: "Refresh token is required." });
        const isValid = !!verifyToken(refreshToken);
        if (!isValid)
            res.status(403).json({ message: "Invalid refresh token." });
        const verifiedToken = verifyToken(refreshToken);
        const newToken = (0, exports.createToken)(verifiedToken.user);
        res.status(200).json({ access: newToken });
    }
    catch (error) {
        next(error);
    }
};
exports.issueNewToken = issueNewToken;
const protect = (req, res, next) => {
    const bearer = req.headers.authorization;
    try {
        if (!bearer) {
            res.status(401).json({ message: "Not Authorized." });
        }
        else {
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
    }
    catch (error) {
        res.status(401).json({ message: "Failed to verify token." });
    }
};
exports.protect = protect;
