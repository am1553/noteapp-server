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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_1 = __importDefault(require("./db/index"));
const morgan_1 = __importDefault(require("morgan"));
const auth_1 = require("./modules/auth");
const router_1 = require("./router");
const app = (0, express_1.default)();
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    method: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
const testDatabaseConnection = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.query("SELECT 1");
        console.log("CONNECTED TO DB...");
        next();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database connection failed" });
    }
});
app.use(testDatabaseConnection);
app.use("/auth", router_1.authRouter);
app.use("/api/v1", auth_1.protect, router_1.appRouter);
exports.default = app;
