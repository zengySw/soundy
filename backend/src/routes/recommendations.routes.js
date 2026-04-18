import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { get_recommendations } from "../controllers/recommendations.controller.js";

const router = Router();

router.get("/", authMiddleware, get_recommendations);

export default router;
