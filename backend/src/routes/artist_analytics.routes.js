import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  get_artist_geography,
  get_artist_plays,
  get_artist_sources,
  get_artist_top_tracks,
} from "../controllers/artist_analytics.controller.js";

const router = Router();

router.get("/plays", authMiddleware, get_artist_plays);
router.get("/top_tracks", authMiddleware, get_artist_top_tracks);
router.get("/geography", authMiddleware, get_artist_geography);
router.get("/sources", authMiddleware, get_artist_sources);

export default router;
