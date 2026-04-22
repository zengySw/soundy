import { config } from "../config/env.js";
import {
  add_track_to_playlist_for_user,
  create_playlist_for_user,
  create_playlist_invite_for_user,
  get_playlist_payload_for_user,
  list_playlists_for_user,
  remove_track_from_playlist_for_user,
  reorder_playlist_tracks_for_user,
} from "../service/playlists.service.js";

function get_user_id(req) {
  return req.user?.userId ? String(req.user.userId) : null;
}

function resolve_frontend_base_url(req) {
  const request_origin = String(req.get("origin") || "").trim();
  if (request_origin) {
    return request_origin;
  }
  const fallback_origin = String(config.CORS_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  return fallback_origin || "http://localhost:3000";
}

function map_playlist_error(error, res) {
  if (error?.message === "PLAYLIST_NOT_FOUND") {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (error?.message === "PLAYLIST_FORBIDDEN") {
    return res.status(403).json({ message: "No access to playlist" });
  }
  if (error?.message === "PLAYLIST_NAME_REQUIRED") {
    return res.status(400).json({ message: "Playlist name is required" });
  }
  if (error?.message === "PLAYLIST_NAME_CONFLICT") {
    return res.status(409).json({ message: "Playlist with this name already exists" });
  }
  if (error?.message === "TRACK_ID_REQUIRED") {
    return res.status(400).json({ message: "Track id is required" });
  }
  if (error?.message === "TRACK_NOT_FOUND") {
    return res.status(404).json({ message: "Track not found" });
  }
  if (error?.message === "PLAYLIST_ORDER_INVALID") {
    return res.status(400).json({ message: "Invalid playlist order payload" });
  }

  console.error("Playlists error:", error);
  return res.status(500).json({ message: "Server error" });
}

export async function get_playlists(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const playlists = await list_playlists_for_user(user_id);
    return res.json(playlists);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function post_playlist(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const playlist = await create_playlist_for_user(user_id, req.body || {});
    return res.status(201).json(playlist);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function get_playlist_by_id(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const payload = await get_playlist_payload_for_user(String(req.params.id || ""), user_id);
    return res.json(payload);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function post_playlist_track(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const result = await add_track_to_playlist_for_user(
      String(req.params.id || ""),
      user_id,
      req.body || {},
    );
    return res.status(result.added ? 201 : 200).json(result);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function delete_playlist_track(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const result = await remove_track_from_playlist_for_user(
      String(req.params.id || ""),
      user_id,
      String(req.params.trackId || ""),
    );
    return res.json(result);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function put_playlist_reorder(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const result = await reorder_playlist_tracks_for_user(
      String(req.params.id || ""),
      user_id,
      req.body?.new_order,
    );
    return res.json(result);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function post_playlist_invite(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const invite = await create_playlist_invite_for_user(
      String(req.params.id || ""),
      user_id,
      req.body || {},
    );

    const frontend_base_url = resolve_frontend_base_url(req);
    const invite_url = `${frontend_base_url}/playlists/${invite.playlist_id}?invite=${invite.token}`;

    return res.status(201).json({
      ...invite,
      invite_url,
    });
  } catch (error) {
    return map_playlist_error(error, res);
  }
}
