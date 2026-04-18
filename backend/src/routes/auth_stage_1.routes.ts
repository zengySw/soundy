import { Router } from "express";
import { login, me, register } from "../controllers/auth_stage_1.controller.js";
import { verify_token } from "../middleware/verify_token.middleware.js";

const auth_stage_1_router = Router();

auth_stage_1_router.post("/register", register);
auth_stage_1_router.post("/login", login);
auth_stage_1_router.get("/me", verify_token, me);

export default auth_stage_1_router;
