import { config } from "../config/env.js";
import {
  accept_playlist_invite_for_user,
  add_track_to_playlist_for_user,
  create_playlist_for_user,
  create_playlist_invite_for_user,
  get_playlist_payload_for_user,
  list_playlists_for_user,
  remove_track_from_playlist_for_user,
  reorder_playlist_tracks_for_user,
} from "../service/playlists.service.js";
import { send_api_error } from "../utils/api-response.util.js";

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
    return send_api_error(res, {
      status: 404,
      code: "PLAYLIST_NOT_FOUND",
      message: "Playlist not found",
    });
  }
  if (error?.message === "PLAYLIST_FORBIDDEN") {
    return send_api_error(res, {
      status: 403,
      code: "PLAYLIST_FORBIDDEN",
      message: "No access to playlist",
    });
  }
  if (error?.message === "PLAYLIST_NAME_REQUIRED") {
    return send_api_error(res, {
      status: 400,
      code: "PLAYLIST_NAME_REQUIRED",
      message: "Playlist name is required",
    });
  }
  if (error?.message === "PLAYLIST_NAME_CONFLICT") {
    return send_api_error(res, {
      status: 409,
      code: "PLAYLIST_NAME_CONFLICT",
      message: "Playlist with this name already exists",
    });
  }
  if (error?.message === "TRACK_ID_REQUIRED") {
    return send_api_error(res, {
      status: 400,
      code: "TRACK_ID_REQUIRED",
      message: "Track id is required",
    });
  }
  if (error?.message === "TRACK_NOT_FOUND") {
    return send_api_error(res, {
      status: 404,
      code: "TRACK_NOT_FOUND",
      message: "Track not found",
    });
  }
  if (error?.message === "PLAYLIST_ORDER_INVALID") {
    return send_api_error(res, {
      status: 400,
      code: "PLAYLIST_ORDER_INVALID",
      message: "Invalid playlist order payload",
    });
  }
  if (error?.message === "PLAYLIST_INVITE_TOKEN_REQUIRED") {
    return send_api_error(res, {
      status: 400,
      code: "PLAYLIST_INVITE_TOKEN_REQUIRED",
      message: "Invite token is required",
    });
  }
  if (error?.message === "PLAYLIST_INVITE_NOT_FOUND") {
    return send_api_error(res, {
      status: 404,
      code: "PLAYLIST_INVITE_NOT_FOUND",
      message: "Invite not found",
    });
  }
  if (error?.message === "PLAYLIST_INVITE_REVOKED") {
    return send_api_error(res, {
      status: 409,
      code: "PLAYLIST_INVITE_REVOKED",
      message: "Invite is no longer active",
    });
  }
  if (error?.message === "PLAYLIST_INVITE_EXPIRED") {
    return send_api_error(res, {
      status: 410,
      code: "PLAYLIST_INVITE_EXPIRED",
      message: "Invite has expired",
    });
  }

  console.error("Playlists error:", error);
  return send_api_error(res, {
    status: 500,
    code: "PLAYLISTS_FAILED",
    message: "Server error",
  });
}

export async function get_playlists(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
  }

  try {
    const payload = await get_playlist_payload_for_user(String(req.params.id || ""), user_id);
    return res.json({
      ...payload,
      realtime_enabled: config.PLAYLIST_REALTIME_ENABLED,
    });
  } catch (error) {
    return map_playlist_error(error, res);
  }
}

export async function post_playlist_track(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
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

export async function post_playlist_invite_accept(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return send_api_error(res, {
      status: 401,
      code: "NO_SESSION",
      message: "No session",
    });
  }

  try {
    const result = await accept_playlist_invite_for_user(
      String(req.params.token || ""),
      user_id,
    );
    return res.json(result);
  } catch (error) {
    return map_playlist_error(error, res);
  }
}
