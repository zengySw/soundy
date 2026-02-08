import { Router } from "express";
import { listTracks, streamTrack } from "../controllers/tracks.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, listTracks);
router.get("/:id/stream", authMiddleware, streamTrack);

export default router;
