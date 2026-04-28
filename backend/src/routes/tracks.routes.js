import { Router } from "express";
import {
  get_track_cover,
  get_tracks,
  stream_ads_audio,
  stream_track_preview,
  stream_track_audio,
} from "../controllers/tracks.controller.js";

const router = Router();

router.get("/", get_tracks);
router.get("/ads/stream", stream_ads_audio);
router.get("/:id/cover", get_track_cover);
router.get("/:id/preview", stream_track_preview);
router.get("/:id/stream", stream_track_audio);

export default router;
