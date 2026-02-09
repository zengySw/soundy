import { Router } from "express";
import { listTracks, streamTrack, streamAd } from "../controllers/tracks.controller.js";

const router = Router();

router.get("/", listTracks);
router.get("/ads/stream", streamAd);
router.get("/:id/stream", streamTrack);

export default router;
