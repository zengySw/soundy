import { Router } from "express";
import { config } from "../config/env.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    features: {
      playlist_realtime_enabled: config.PLAYLIST_REALTIME_ENABLED,
      media_driver: config.MEDIA_DRIVER,
    },
  });
});

export default router;
