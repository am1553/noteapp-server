import { NextFunction, Request, Response, Router } from "express";
import { createUser, signIn } from "./handlers/users";
import { issueNewToken } from "./modules/auth";

const authRouter: Router = Router();

authRouter.post("/users", createUser);
authRouter.post("/sign-in", signIn);
authRouter.post("/refresh-token", issueNewToken);

export default authRouter;
