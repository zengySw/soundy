import {
  addTrackToPlaylist,
  createPlaylist,
  getPlaylistWithTracks,
  listPlaylistsByUser,
  removeTrackFromPlaylist,
} from "../service/playlists.service.js";

export async function getPlaylists(req, res) {
  try {
    const userId = req.user.userId;
    const playlists = await listPlaylistsByUser(userId);
    res.json(playlists);
  } catch (err) {
    console.error("Get playlists error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function postPlaylist(req, res) {
  try {
    const userId = req.user.userId;
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const isPublic = Boolean(req.body?.is_public ?? req.body?.isPublic);
    if (!name) {
      return res.status(400).json({ message: "PLAYLIST_NAME_REQUIRED" });
    }
    const result = await createPlaylist(userId, { name, description, isPublic });
    if (result.exists) {
      return res.status(409).json({ message: "PLAYLIST_ALREADY_EXISTS" });
    }
    res.status(201).json(result);
  } catch (err) {
    console.error("Create playlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getPlaylist(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const playlist = await getPlaylistWithTracks(userId, id);
    if (!playlist) {
      return res.status(404).json({ message: "PLAYLIST_NOT_FOUND" });
    }
    res.json(playlist);
  } catch (err) {
    console.error("Get playlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function postPlaylistTrack(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const trackId = typeof req.body?.trackId === "string" ? req.body.trackId : "";
    if (!trackId) {
      return res.status(400).json({ message: "TRACK_ID_REQUIRED" });
    }
    const result = await addTrackToPlaylist(userId, id, trackId);
    if (result.notFound) {
      return res.status(404).json({ message: "PLAYLIST_NOT_FOUND" });
    }
    res.json({ added: Boolean(result.added) });
  } catch (err) {
    console.error("Add playlist track error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deletePlaylistTrack(req, res) {
  try {
    const userId = req.user.userId;
    const { id, trackId } = req.params;
    if (!trackId) {
      return res.status(400).json({ message: "TRACK_ID_REQUIRED" });
    }
    const result = await removeTrackFromPlaylist(userId, id, trackId);
    if (result.notFound) {
      return res.status(404).json({ message: "PLAYLIST_NOT_FOUND" });
    }
    res.json({ removed: Boolean(result.removed) });
  } catch (err) {
    console.error("Remove playlist track error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
