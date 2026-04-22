import {
  get_artist_analytics_geography,
  get_artist_analytics_plays,
  get_artist_analytics_sources,
  get_artist_analytics_top_tracks,
  parse_analytics_period,
} from "../service/artist_analytics.service.js";

function get_user_id(req) {
  return req.user?.userId ? String(req.user.userId) : null;
}

function get_analytics_context(req) {
  const user_id = get_user_id(req);
  if (!user_id) {
    throw new Error("UNAUTHORIZED");
  }
  const { period, period_days } = parse_analytics_period(req.query?.period);
  return {
    artist_id: user_id,
    period,
    period_days,
  };
}

function map_error(error, res) {
  if (error?.message === "UNAUTHORIZED") {
    return res.status(401).json({ message: "No session" });
  }
  console.error("Artist analytics error:", error);
  return res.status(500).json({ message: "Server error" });
}

export async function get_artist_plays(req, res) {
  try {
    const context = get_analytics_context(req);
    const payload = await get_artist_analytics_plays(context);
    return res.json(payload);
  } catch (error) {
    return map_error(error, res);
  }
}

export async function get_artist_top_tracks(req, res) {
  try {
    const context = get_analytics_context(req);
    const payload = await get_artist_analytics_top_tracks(context);
    return res.json(payload);
  } catch (error) {
    return map_error(error, res);
  }
}

export async function get_artist_geography(req, res) {
  try {
    const context = get_analytics_context(req);
    const payload = await get_artist_analytics_geography(context);
    return res.json(payload);
  } catch (error) {
    return map_error(error, res);
  }
}

export async function get_artist_sources(req, res) {
  try {
    const context = get_analytics_context(req);
    const payload = await get_artist_analytics_sources(context);
    return res.json(payload);
  } catch (error) {
    return map_error(error, res);
  }
}
