import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  delete_playlist_track,
  get_playlist_by_id,
  get_playlists,
  post_playlist,
  post_playlist_invite_accept,
  post_playlist_invite,
  post_playlist_track,
  put_playlist_reorder,
} from "../controllers/playlists.controller.js";

const router = Router();

router.get("/", authMiddleware, get_playlists);
router.post("/", authMiddleware, post_playlist);
router.post("/invites/:token/accept", authMiddleware, post_playlist_invite_accept);
router.get("/:id", authMiddleware, get_playlist_by_id);
router.post("/:id/tracks", authMiddleware, post_playlist_track);
router.delete("/:id/tracks/:trackId", authMiddleware, delete_playlist_track);
router.put("/:id/tracks/reorder", authMiddleware, put_playlist_reorder);
router.post("/:id/invite", authMiddleware, post_playlist_invite);

export default router;
