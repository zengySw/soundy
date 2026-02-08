import { Router } from "express";
import {
  adminMe,
  adminListTracks,
  adminListUsers,
  adminListAdmins,
  adminListAlbums,
  adminConvertTrack,
  adminConvertCover,
  adminAutoConvert,
  adminUploadTrack,
  adminCreateAlbum,
} from "../controllers/admin.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/me", adminMiddleware, adminMe);
router.get("/users", adminMiddleware, adminListUsers);
router.get("/admins", adminMiddleware, adminListAdmins);
router.get("/tracks", adminMiddleware, adminListTracks);
router.get("/albums", adminMiddleware, adminListAlbums);
router.post("/albums", adminMiddleware, adminCreateAlbum);
router.post(
  "/tracks/upload",
  adminMiddleware,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  adminUploadTrack,
);
router.post("/convert/track", adminMiddleware, adminConvertTrack);
router.post("/convert/cover", adminMiddleware, adminConvertCover);
router.post("/convert/auto", adminMiddleware, adminAutoConvert);

export default router;
