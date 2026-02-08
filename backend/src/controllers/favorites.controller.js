import { listFavoritesByUser, addFavorite, removeFavorite } from "../service/favorites.service.js";

export async function getFavorites(req, res) {
  try {
    const userId = req.user.userId;
    const favorites = await listFavoritesByUser(userId);
    res.json(favorites);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function postFavorite(req, res) {
  try {
    const userId = req.user.userId;
    const { trackId } = req.params;
    await addFavorite(userId, trackId);
    res.status(201).json({ message: "Added" });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteFavorite(req, res) {
  try {
    const userId = req.user.userId;
    const { trackId } = req.params;
    await removeFavorite(userId, trackId);
    res.json({ message: "Removed" });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
