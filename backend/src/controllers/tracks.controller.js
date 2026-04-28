import {
  ensure_tracks_seeded,
  increment_track_play_count,
  list_tracks_for_frontend,
  resolve_ads_audio_absolute_path,
  resolve_track_audio_absolute_path,
  resolve_track_cover_absolute_path,
} from "../service/catalog.service.js";
import { record_listening_event } from "../service/listening_events.service.js";
import { resolve_session_user_id } from "../service/session_user.service.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";

function build_backend_base_url(req) {
  const host = req.get("host");
  if (!host) {
    return "";
  }
  return `${req.protocol}://${host}`;
}

export async function get_tracks(req, res) {
  try {
    const backend_base_url = build_backend_base_url(req);
    const tracks = await list_tracks_for_frontend(backend_base_url);
    return res.json(tracks);
  } catch (error) {
    if (is_database_unavailable_error(error)) {
      return send_api_error(res, {
        status: 503,
        code: "DB_UNAVAILABLE",
        message: "Database unavailable",
      });
    }
    console.error("Get tracks error:", error);
    return send_api_error(res, {
      status: 500,
      code: "TRACKS_LIST_FAILED",
      message: "Server error",
    });
  }
}

export async function stream_track_audio(req, res) {
  const track_id = String(req.params?.id || "").trim();
  if (!track_id) {
    return send_api_error(res, {
      status: 400,
      code: "TRACK_ID_INVALID",
      message: "Invalid track id",
    });
  }

  try {
    await ensure_tracks_seeded();
    const payload = await resolve_track_audio_absolute_path(track_id);
    if (!payload) {
      return send_api_error(res, {
        status: 404,
        code: "TRACK_NOT_FOUND",
        message: "Track not found",
      });
    }

    if (payload.driver === "r2" && payload.public_url) {
      res.redirect(302, payload.public_url);
    } else if (payload.driver === "local" && payload.absolute_path) {
      res.sendFile(payload.absolute_path);
    } else {
      return send_api_error(res, {
        status: 500,
        code: "TRACK_STREAM_UNAVAILABLE",
        message: "Track stream unavailable",
      });
    }

    void increment_track_play_count(track_id).catch((error) => {
      console.error("Increment track play count error:", error);
    });

    void (async () => {
      try {
        const user_id = await resolve_session_user_id(req);
        const source = String(req.query?.source ?? req.query?.src ?? "unknown")
          .trim()
          .slice(0, 40);
        await record_listening_event({
          user_id,
          track_id,
          artist_id: payload.track.artist_id ?? null,
          source: source || "unknown",
          country_code: null,
          city: null,
        });
      } catch (error) {
        console.error("Record listening event error:", error);
      }
    })();

    return undefined;
  } catch (error) {
    console.error("Stream track error:", error);
    return send_api_error(res, {
      status: 500,
      code: "TRACK_STREAM_FAILED",
      message: "Server error",
    });
  }
}

export async function stream_track_preview(req, res) {
  const track_id = String(req.params?.id || "").trim();
  if (!track_id) {
    return send_api_error(res, {
      status: 400,
      code: "TRACK_ID_INVALID",
      message: "Invalid track id",
    });
  }

  try {
    await ensure_tracks_seeded();
    const payload = await resolve_track_audio_absolute_path(track_id);
    if (!payload) {
      return send_api_error(res, {
        status: 404,
        code: "TRACK_NOT_FOUND",
        message: "Track not found",
      });
    }

    if (payload.driver === "r2" && payload.public_url) {
      res.redirect(302, payload.public_url);
      return undefined;
    }
    if (payload.driver === "local" && payload.absolute_path) {
      res.sendFile(payload.absolute_path);
      return undefined;
    }

    return send_api_error(res, {
      status: 500,
      code: "TRACK_PREVIEW_UNAVAILABLE",
      message: "Track preview unavailable",
    });
  } catch (error) {
    console.error("Stream track preview error:", error);
    return send_api_error(res, {
      status: 500,
      code: "TRACK_PREVIEW_FAILED",
      message: "Server error",
    });
  }
}

export async function stream_ads_audio(_req, res) {
  try {
    const ad_payload = await resolve_ads_audio_absolute_path();
    if (!ad_payload) {
      return send_api_error(res, {
        status: 404,
        code: "ADS_AUDIO_NOT_FOUND",
        message: "Ad audio not found",
      });
    }
    if (ad_payload.driver === "r2" && ad_payload.public_url) {
      res.redirect(302, ad_payload.public_url);
      return undefined;
    }
    if (ad_payload.driver === "local" && ad_payload.absolute_path) {
      res.sendFile(ad_payload.absolute_path);
      return undefined;
    }
    return send_api_error(res, {
      status: 500,
      code: "ADS_AUDIO_UNAVAILABLE",
      message: "Ad audio unavailable",
    });
  } catch (error) {
    console.error("Stream ads audio error:", error);
    return send_api_error(res, {
      status: 500,
      code: "ADS_AUDIO_STREAM_FAILED",
      message: "Server error",
    });
  }
}

export async function get_track_cover(req, res) {
  const track_id = String(req.params?.id || "").trim();
  if (!track_id) {
    return send_api_error(res, {
      status: 400,
      code: "TRACK_ID_INVALID",
      message: "Invalid track id",
    });
  }

  try {
    const payload = await resolve_track_cover_absolute_path(track_id);
    if (!payload) {
      return send_api_error(res, {
        status: 404,
        code: "TRACK_COVER_NOT_FOUND",
        message: "Cover not found",
      });
    }
    if (payload.driver === "r2" && payload.public_url) {
      res.redirect(302, payload.public_url);
      return undefined;
    }
    if (payload.driver === "local" && payload.absolute_path) {
      res.sendFile(payload.absolute_path);
      return undefined;
    }
    return send_api_error(res, {
      status: 500,
      code: "TRACK_COVER_UNAVAILABLE",
      message: "Cover unavailable",
    });
  } catch (error) {
    console.error("Get track cover error:", error);
    return send_api_error(res, {
      status: 500,
      code: "TRACK_COVER_FAILED",
      message: "Server error",
    });
  }
}
