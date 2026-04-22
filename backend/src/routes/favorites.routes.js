import { Router } from "express";
import {
  delete_favorite,
  get_favorites,
  post_favorite,
} from "../controllers/favorites.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, get_favorites);
router.post("/:trackId", authMiddleware, post_favorite);
router.delete("/:trackId", authMiddleware, delete_favorite);

export default router;
