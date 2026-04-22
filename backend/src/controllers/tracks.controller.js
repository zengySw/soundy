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
    console.error("Get tracks error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function stream_track_audio(req, res) {
  const track_id = String(req.params?.id || "").trim();
  if (!track_id) {
    return res.status(400).json({ message: "Invalid track id" });
  }

  try {
    await ensure_tracks_seeded();
    const payload = await resolve_track_audio_absolute_path(track_id);
    if (!payload) {
      return res.status(404).json({ message: "Track not found" });
    }

    res.sendFile(payload.absolute_path);

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
    return res.status(500).json({ message: "Server error" });
  }
}

export async function stream_ads_audio(_req, res) {
  try {
    const ad_path = await resolve_ads_audio_absolute_path();
    if (!ad_path) {
      return res.status(404).json({ message: "Ad audio not found" });
    }
    res.sendFile(ad_path);
    return undefined;
  } catch (error) {
    console.error("Stream ads audio error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function get_track_cover(req, res) {
  const track_id = String(req.params?.id || "").trim();
  if (!track_id) {
    return res.status(400).json({ message: "Invalid track id" });
  }

  try {
    const payload = await resolve_track_cover_absolute_path(track_id);
    if (!payload) {
      return res.status(404).json({ message: "Cover not found" });
    }
    res.sendFile(payload.absolute_path);
    return undefined;
  } catch (error) {
    console.error("Get track cover error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
