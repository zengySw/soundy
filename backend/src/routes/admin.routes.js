import fs from "fs";
import multer from "multer";
import { Router } from "express";
import { config } from "../config/env.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import {
  get_admin_admins,
  get_admin_albums,
  get_admin_artists,
  get_admin_me,
  get_admin_tracks,
  get_admin_users,
  post_admin_album,
  post_admin_artist,
  post_admin_convert_auto,
  post_admin_convert_track,
  post_admin_track_upload,
} from "../controllers/admin.controller.js";

const router = Router();

fs.mkdirSync(config.UPLOAD_TMP_DIR, { recursive: true });

const upload = multer({
  dest: config.UPLOAD_TMP_DIR,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 2,
  },
});

router.get("/me", adminMiddleware, get_admin_me);
router.get("/tracks", adminMiddleware, get_admin_tracks);
router.get("/users", adminMiddleware, get_admin_users);
router.get("/admins", adminMiddleware, get_admin_admins);
router.get("/albums", adminMiddleware, get_admin_albums);
router.post("/albums", adminMiddleware, post_admin_album);
router.get("/artists", adminMiddleware, get_admin_artists);
router.post("/artists", adminMiddleware, post_admin_artist);
router.post("/convert/track", adminMiddleware, post_admin_convert_track);
router.post("/convert/auto", adminMiddleware, post_admin_convert_auto);
router.post(
  "/tracks/upload",
  adminMiddleware,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  post_admin_track_upload,
);

export default router;
