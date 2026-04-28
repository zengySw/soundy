import {
  normalize_search_query,
  resolve_search_type,
  resolve_search_limit,
  search_catalog,
} from "../service/search.service.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";

export async function get_search_results(req, res) {
  try {
    const query_text = normalize_search_query(
      typeof req.query?.q === "string" ? req.query.q : "",
    );
    const search_type = resolve_search_type(req.query?.type);
    const search_limit = resolve_search_limit(
      req.query?.limit,
      search_type === "all" ? 30 : 20,
    );

    if (!query_text) {
      return res.json({
        query_text: "",
        search_type,
        items: [],
      });
    }

    const items = await search_catalog({
      query_text,
      search_type,
      search_limit,
    });

    return res.json({
      query_text,
      search_type,
      items,
    });
  } catch (err) {
    if (err?.message === "INVALID_SEARCH_TYPE") {
      return send_api_error(res, {
        status: 400,
        code: "INVALID_SEARCH_TYPE",
        message: "Invalid type. Use all, tracks, artists or playlists.",
      });
    }

    if (err?.message === "INVALID_SEARCH_LIMIT") {
      return send_api_error(res, {
        status: 400,
        code: "INVALID_SEARCH_LIMIT",
        message: "Invalid limit.",
      });
    }

    if (err?.message === "PG_DATABASE_URL_MISSING") {
      return send_api_error(res, {
        status: 500,
        code: "PG_DATABASE_URL_MISSING",
        message: "PG_DATABASE_URL_MISSING",
      });
    }

    if (is_database_unavailable_error(err)) {
      return send_api_error(res, {
        status: 503,
        code: "DB_UNAVAILABLE",
        message: "Database unavailable",
      });
    }

    console.error("Search API error:", err);
    return send_api_error(res, {
      status: 500,
      code: "SEARCH_FAILED",
      message: "Server error",
    });
  }
}
