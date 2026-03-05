import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getFavorites, postFavorite, deleteFavorite } from "../controllers/favorites.controller.js";

const router = Router();

router.get("/", authMiddleware, getFavorites);
router.post("/:trackId", authMiddleware, postFavorite);
router.delete("/:trackId", authMiddleware, deleteFavorite);

export default router;
