import { get_recommendations_for_user } from "../service/recommendations.service.js";

export async function get_recommendations(req, res) {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(401).json({ message: "No session" });
    }

    const recommendations = await get_recommendations_for_user(user_id);

    res.json({
      user_id,
      items: recommendations,
    });
  } catch (err) {
    if (
      err?.message === "PG_DATABASE_URL_MISSING" ||
      err?.message === "PG_TRACKS_TABLE_NOT_FOUND" ||
      err?.message === "PG_LISTENING_EVENTS_TABLE_NOT_FOUND" ||
      err?.message === "PG_RECOMMENDATIONS_SCHEMA_MISSING_COLUMNS"
    ) {
      return res.status(500).json({
        message: err.message,
      });
    }

    console.error("Get recommendations error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
