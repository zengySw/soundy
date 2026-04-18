import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getUserProfile, patchMyTheme } from "../controllers/users.controller.js";

const router = Router();

router.patch("/me/theme", authMiddleware, patchMyTheme);
router.get("/:id", getUserProfile);

export default router;
