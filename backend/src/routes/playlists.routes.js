import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getPlaylist,
  getPlaylists,
  postPlaylist,
  postPlaylistTrack,
  deletePlaylistTrack,
} from "../controllers/playlists.controller.js";

const router = Router();

router.get("/", authMiddleware, getPlaylists);
router.post("/", authMiddleware, postPlaylist);
router.get("/:id", authMiddleware, getPlaylist);
router.post("/:id/tracks", authMiddleware, postPlaylistTrack);
router.delete("/:id/tracks/:trackId", authMiddleware, deletePlaylistTrack);

export default router;
