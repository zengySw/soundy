import { pg_query } from "../db_pg.js";

const allowed_periods = new Map([
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
]);

function normalize_period(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (allowed_periods.has(normalized)) {
    return normalized;
  }
  return "30d";
}

function get_period_days(period) {
  return allowed_periods.get(period) ?? 30;
}

async function table_exists(table_name) {
  const result = await pg_query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [table_name],
  );
  return result.rows.length > 0;
}

async function ensure_analytics_tables() {
  const [has_events, has_tracks] = await Promise.all([
    table_exists("listening_events"),
    table_exists("tracks"),
  ]);
  return has_events && has_tracks;
}

function with_meta({ period, period_days, artist_id, items, extra = {} }) {
  return {
    period,
    period_days,
    artist_id,
    items,
    ...extra,
  };
}

export function parse_analytics_period(raw_period) {
  const period = normalize_period(raw_period);
  return { period, period_days: get_period_days(period) };
}

export async function get_artist_analytics_plays({ artist_id, period, period_days }) {
  const has_tables = await ensure_analytics_tables();
  if (!has_tables) {
    return with_meta({
      period,
      period_days,
      artist_id,
      items: [],
      extra: { total_plays: 0 },
    });
  }

  const result = await pg_query(
    `
      SELECT
        DATE_TRUNC('day', le.played_at)::date AS play_date,
        COUNT(*)::int AS plays_count
      FROM listening_events le
      WHERE le.played_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY DATE_TRUNC('day', le.played_at)::date
      ORDER BY play_date ASC
    `,
    [period_days],
  );

  const items = result.rows.map((row) => ({
    play_date: new Date(row.play_date).toISOString().slice(0, 10),
    plays_count: Number(row.plays_count || 0),
  }));
  const total_plays = items.reduce(
    (accumulator, item) => accumulator + item.plays_count,
    0,
  );

  return with_meta({
    period,
    period_days,
    artist_id,
    items,
    extra: { total_plays },
  });
}

export async function get_artist_analytics_top_tracks({ artist_id, period, period_days }) {
  const has_tables = await ensure_analytics_tables();
  if (!has_tables) {
    return with_meta({
      period,
      period_days,
      artist_id,
      items: [],
    });
  }

  const result = await pg_query(
    `
      SELECT
        le.track_id::text AS track_id,
        COALESCE(t.title, 'Unknown track') AS track_title,
        COUNT(*)::int AS plays_count
      FROM listening_events le
      LEFT JOIN tracks t ON t.id = le.track_id
      WHERE le.played_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY le.track_id, t.title
      ORDER BY plays_count DESC, track_title ASC
      LIMIT 20
    `,
    [period_days],
  );

  const items = result.rows.map((row) => ({
    track_id: String(row.track_id),
    track_title: String(row.track_title || "Unknown track"),
    plays_count: Number(row.plays_count || 0),
  }));

  return with_meta({
    period,
    period_days,
    artist_id,
    items,
  });
}

export async function get_artist_analytics_sources({ artist_id, period, period_days }) {
  const has_tables = await ensure_analytics_tables();
  if (!has_tables) {
    return with_meta({
      period,
      period_days,
      artist_id,
      items: [],
    });
  }

  const result = await pg_query(
    `
      SELECT
        COALESCE(NULLIF(TRIM(le.source), ''), 'unknown') AS source,
        COUNT(*)::int AS plays_count
      FROM listening_events le
      WHERE le.played_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY COALESCE(NULLIF(TRIM(le.source), ''), 'unknown')
      ORDER BY plays_count DESC, source ASC
    `,
    [period_days],
  );

  const items = result.rows.map((row) => ({
    source: String(row.source || "unknown"),
    plays_count: Number(row.plays_count || 0),
  }));

  return with_meta({
    period,
    period_days,
    artist_id,
    items,
  });
}

export async function get_artist_analytics_geography({ artist_id, period, period_days }) {
  const has_tables = await ensure_analytics_tables();
  if (!has_tables) {
    return with_meta({
      period,
      period_days,
      artist_id,
      items: [],
    });
  }

  const result = await pg_query(
    `
      SELECT
        COALESCE(NULLIF(TRIM(le.country_code), ''), 'unknown') AS country_code,
        COALESCE(NULLIF(TRIM(le.city), ''), 'unknown') AS city_name,
        COUNT(*)::int AS plays_count,
        COUNT(DISTINCT le.user_id)::int AS listeners_count
      FROM listening_events le
      WHERE le.played_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY
        COALESCE(NULLIF(TRIM(le.country_code), ''), 'unknown'),
        COALESCE(NULLIF(TRIM(le.city), ''), 'unknown')
      ORDER BY plays_count DESC, listeners_count DESC, country_code ASC
      LIMIT 100
    `,
    [period_days],
  );

  const items = result.rows.map((row) => ({
    country_code: String(row.country_code || "unknown"),
    city_name: String(row.city_name || "unknown"),
    plays_count: Number(row.plays_count || 0),
    listeners_count: Number(row.listeners_count || 0),
  }));

  return with_meta({
    period,
    period_days,
    artist_id,
    items,
  });
}
