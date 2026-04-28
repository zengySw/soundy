import { pg_query } from "../db_pg.js";
import { config } from "../config/env.js";
import {
  generate_track_embedding,
  embedding_to_pgvector,
} from "./openai_embeddings.service.js";

const pg_table_columns_cache = new Map();
let pgvector_checked = false;
let pgvector_available = false;
let pgvector_warning_logged = false;

function pick_column(columns, candidates) {
  for (const column_name of candidates) {
    if (columns.has(column_name)) {
      return column_name;
    }
  }
  return null;
}

async function get_pg_table_columns(table_name) {
  if (pg_table_columns_cache.has(table_name)) {
    return pg_table_columns_cache.get(table_name);
  }

  const result = await pg_query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [table_name],
  );
  const columns = new Set(
    result.rows.map((row) => String(row.column_name).toLowerCase()),
  );
  pg_table_columns_cache.set(table_name, columns);
  return columns;
}

async function ensure_pgvector_extension() {
  if (pgvector_checked) {
    return pgvector_available;
  }
  try {
    await pg_query(`CREATE EXTENSION IF NOT EXISTS vector`);
    pgvector_available = true;
  } catch (error) {
    // PostgreSQL installed without pgvector package.
    // In this case we gracefully disable embedding-based recommendations.
    if (error?.code === "0A000" || /extension\s+"?vector"?/i.test(String(error?.message))) {
      pgvector_available = false;
      if (!pgvector_warning_logged) {
        console.warn("pgvector extension is unavailable; recommendations fallback is enabled.");
        pgvector_warning_logged = true;
      }
    } else {
      throw error;
    }
  }
  pgvector_checked = true;
  return pgvector_available;
}

function to_number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalize_genre(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }
  return String(value ?? "").trim();
}

async function list_recent_track_ids_for_user({
  user_id,
  events_user_id_column,
  events_track_id_column,
  events_played_at_column,
  limit = 20,
}) {
  if (!events_user_id_column || !events_track_id_column || !events_played_at_column) {
    return [];
  }

  const result = await pg_query(
    `
      SELECT le.${events_track_id_column}::text AS track_id
      FROM listening_events le
      WHERE le.${events_user_id_column}::text = $1
      ORDER BY le.${events_played_at_column} DESC
      LIMIT $2
    `,
    [user_id, limit],
  );

  return result.rows.map((row) => String(row.track_id));
}

async function get_fallback_recommendations_for_user({
  user_id,
  tracks_columns,
  listening_events_columns,
  recommendations_limit,
}) {
  const tracks_id_column = pick_column(tracks_columns, ["id", "track_id"]);
  const tracks_title_column = pick_column(tracks_columns, ["title", "name"]);
  const tracks_artist_column = pick_column(tracks_columns, ["artist", "artist_name"]);
  const tracks_genre_column = pick_column(tracks_columns, ["genre"]);
  const tracks_play_count_column = pick_column(tracks_columns, ["play_count"]);
  const tracks_created_at_column = pick_column(tracks_columns, ["created_at"]);

  if (!tracks_id_column || !tracks_title_column) {
    return [];
  }

  const events_user_id_column = pick_column(listening_events_columns, [
    "user_id",
    "userid",
  ]);
  const events_track_id_column = pick_column(listening_events_columns, [
    "track_id",
    "trackid",
  ]);
  const events_played_at_column = pick_column(listening_events_columns, [
    "played_at",
    "created_at",
  ]);

  const recent_track_ids = await list_recent_track_ids_for_user({
    user_id,
    events_user_id_column,
    events_track_id_column,
    events_played_at_column,
    limit: 50,
  });

  const sort_parts = [];
  if (tracks_play_count_column) {
    sort_parts.push(`COALESCE(t.${tracks_play_count_column}, 0) DESC`);
  }
  if (tracks_created_at_column) {
    sort_parts.push(`t.${tracks_created_at_column} DESC`);
  }
  sort_parts.push(`t.${tracks_title_column} ASC`);

  const result = await pg_query(
    `
      SELECT
        t.${tracks_id_column}::text AS track_id,
        t.${tracks_title_column} AS title,
        ${tracks_artist_column ? `t.${tracks_artist_column}` : `'Unknown artist'`} AS artist,
        ${tracks_genre_column ? `t.${tracks_genre_column}` : `NULL`} AS genre,
        NULL::float8 AS distance
      FROM tracks t
      WHERE NOT (t.${tracks_id_column}::text = ANY($1::text[]))
      ORDER BY ${sort_parts.join(", ")}
      LIMIT $2
    `,
    [recent_track_ids, recommendations_limit],
  );

  return result.rows.map((row) => ({
    track_id: String(row.track_id),
    title: String(row.title ?? "Unknown track"),
    artist: String(row.artist ?? "Unknown artist"),
    genre: row.genre ? String(row.genre) : null,
    distance: to_number(row.distance),
  }));
}

export async function save_track_embedding({
  track_id,
  title,
  artist,
  genre,
}) {
  const vector_enabled = await ensure_pgvector_extension();
  if (!vector_enabled) {
    return {
      embedding_values_count: 0,
      updated_rows: 0,
      skipped_reason: "PGVECTOR_UNAVAILABLE",
    };
  }

  const tracks_columns = await get_pg_table_columns("tracks");
  if (tracks_columns.size === 0) {
    throw new Error("PG_TRACKS_TABLE_NOT_FOUND");
  }

  const embedding_column = pick_column(tracks_columns, ["embedding"]);
  const id_column = pick_column(tracks_columns, ["id", "track_id"]);
  const title_column = pick_column(tracks_columns, ["title", "name"]);
  const artist_column = pick_column(tracks_columns, ["artist", "artist_name"]);
  const genre_column = pick_column(tracks_columns, ["genre"]);

  if (!embedding_column || !id_column) {
    throw new Error("PG_TRACKS_EMBEDDING_COLUMNS_MISSING");
  }

  const embedding_values = await generate_track_embedding({
    title,
    artist,
    genre: normalize_genre(genre),
  });
  const embedding_vector = embedding_to_pgvector(embedding_values);

  const set_parts = [`${embedding_column} = $2::vector`];
  const set_values = [track_id, embedding_vector];
  let value_index = 3;

  if (title_column) {
    set_parts.push(`${title_column} = COALESCE(NULLIF($${value_index}, ''), ${title_column})`);
    set_values.push(String(title ?? "").trim());
    value_index += 1;
  }
  if (artist_column) {
    set_parts.push(`${artist_column} = COALESCE(NULLIF($${value_index}, ''), ${artist_column})`);
    set_values.push(String(artist ?? "").trim());
    value_index += 1;
  }
  if (genre_column) {
    set_parts.push(`${genre_column} = COALESCE(NULLIF($${value_index}, ''), ${genre_column})`);
    set_values.push(normalize_genre(genre));
    value_index += 1;
  }

  const update_result = await pg_query(
    `
      UPDATE tracks
      SET ${set_parts.join(", ")}
      WHERE ${id_column}::text = $1
    `,
    set_values,
  );

  return {
    embedding_values_count: embedding_values.length,
    updated_rows: update_result.rowCount || 0,
  };
}

export async function get_recommendations_for_user(user_id) {
  const tracks_columns = await get_pg_table_columns("tracks");
  if (tracks_columns.size === 0) {
    throw new Error("PG_TRACKS_TABLE_NOT_FOUND");
  }
  const listening_events_columns = await get_pg_table_columns("listening_events");

  const tracks_id_column = pick_column(tracks_columns, ["id", "track_id"]);
  const tracks_title_column = pick_column(tracks_columns, ["title", "name"]);
  const tracks_artist_column = pick_column(tracks_columns, ["artist", "artist_name"]);
  const tracks_genre_column = pick_column(tracks_columns, ["genre"]);
  const tracks_embedding_column = pick_column(tracks_columns, ["embedding"]);

  const events_user_id_column = pick_column(listening_events_columns, [
    "user_id",
    "userid",
  ]);
  const events_track_id_column = pick_column(listening_events_columns, [
    "track_id",
    "trackid",
  ]);
  const events_played_at_column = pick_column(listening_events_columns, [
    "played_at",
    "created_at",
  ]);

  const recommendations_limit = Math.max(config.RECOMMENDATIONS_LIMIT || 20, 1);

  const fallback_recommendations = () =>
    get_fallback_recommendations_for_user({
      user_id,
      tracks_columns,
      listening_events_columns,
      recommendations_limit,
    });

  const vector_enabled = await ensure_pgvector_extension();
  if (!vector_enabled) {
    return fallback_recommendations();
  }

  if (
    !tracks_id_column ||
    !tracks_title_column ||
    !tracks_embedding_column ||
    !events_user_id_column ||
    !events_track_id_column ||
    !events_played_at_column
  ) {
    return fallback_recommendations();
  }

  const recent_tracks_result = await pg_query(
    `
      SELECT le.${events_track_id_column}::text AS track_id
      FROM listening_events le
      WHERE le.${events_user_id_column}::text = $1
      ORDER BY le.${events_played_at_column} DESC
      LIMIT 10
    `,
    [user_id],
  );
  if (recent_tracks_result.rows.length === 0) {
    return fallback_recommendations();
  }

  try {
    const recommendations_result = await pg_query(
      `
        WITH recent_tracks AS (
          SELECT le.${events_track_id_column}::text AS track_id
          FROM listening_events le
          WHERE le.${events_user_id_column}::text = $1
          ORDER BY le.${events_played_at_column} DESC
          LIMIT 10
        ),
        user_embedding AS (
          SELECT AVG(t.${tracks_embedding_column}) AS embedding
          FROM tracks t
          INNER JOIN recent_tracks rt
            ON t.${tracks_id_column}::text = rt.track_id
          WHERE t.${tracks_embedding_column} IS NOT NULL
        )
        SELECT
          t.${tracks_id_column}::text AS track_id,
          t.${tracks_title_column} AS title,
          ${tracks_artist_column ? `t.${tracks_artist_column}` : `'Unknown artist'`} AS artist,
          ${tracks_genre_column ? `t.${tracks_genre_column}` : `NULL`} AS genre,
          (t.${tracks_embedding_column} <-> ue.embedding) AS distance
        FROM tracks t
        CROSS JOIN user_embedding ue
        WHERE ue.embedding IS NOT NULL
          AND t.${tracks_embedding_column} IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM recent_tracks rt
            WHERE rt.track_id = t.${tracks_id_column}::text
          )
        ORDER BY t.${tracks_embedding_column} <-> ue.embedding ASC
        LIMIT $2
      `,
      [user_id, recommendations_limit],
    );

    const items = recommendations_result.rows.map((row) => ({
      track_id: String(row.track_id),
      title: String(row.title ?? "Unknown track"),
      artist: String(row.artist ?? "Unknown artist"),
      genre: row.genre ? String(row.genre) : null,
      distance: to_number(row.distance),
    }));

    if (items.length > 0) {
      return items;
    }

    return fallback_recommendations();
  } catch (error) {
    console.error("Embedding recommendations failed, fallback enabled:", error);
    return fallback_recommendations();
  }
}
