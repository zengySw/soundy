import {
  add_track_to_favorites,
  list_user_favorites,
  remove_track_from_favorites,
} from "../service/favorites.service.js";

function get_user_id(req) {
  return req.user?.userId ? String(req.user.userId) : null;
}

export async function get_favorites(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  try {
    const items = await list_user_favorites(user_id);
    return res.json(items);
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function post_favorite(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  const track_id = String(req.params?.trackId || "").trim();
  if (!track_id) {
    return res.status(400).json({ message: "Track id is required" });
  }

  try {
    const result = await add_track_to_favorites(user_id, track_id);
    return res.status(result.added ? 201 : 200).json(result);
  } catch (error) {
    if (error?.message === "TRACK_NOT_FOUND") {
      return res.status(404).json({ message: "Track not found" });
    }
    console.error("Post favorite error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function delete_favorite(req, res) {
  const user_id = get_user_id(req);
  if (!user_id) {
    return res.status(401).json({ message: "No session" });
  }

  const track_id = String(req.params?.trackId || "").trim();
  if (!track_id) {
    return res.status(400).json({ message: "Track id is required" });
  }

  try {
    const result = await remove_track_from_favorites(user_id, track_id);
    return res.json(result);
  } catch (error) {
    console.error("Delete favorite error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
