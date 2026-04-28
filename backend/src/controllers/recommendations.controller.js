import { get_recommendations_for_user } from "../service/recommendations.service.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";

export async function get_recommendations(req, res) {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return send_api_error(res, {
        status: 401,
        code: "NO_SESSION",
        message: "No session",
      });
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
      return send_api_error(res, {
        status: 500,
        code: err.message,
        message: err.message,
      });
    }

    if (is_database_unavailable_error(err)) {
      return send_api_error(res, {
        status: 503,
        code: "DB_UNAVAILABLE",
        message: "Database unavailable",
      });
    }

    console.error("Get recommendations error:", err);
    return send_api_error(res, {
      status: 500,
      code: "RECOMMENDATIONS_FAILED",
      message: "Server error",
    });
  }
}
