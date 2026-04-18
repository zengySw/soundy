import { pg_query } from "../db_pg.js";
import { config } from "../config/env.js";
import {
  generate_track_embedding,
  embedding_to_pgvector,
} from "./openai_embeddings.service.js";

const pg_table_columns_cache = new Map();
let pgvector_checked = false;

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
    return;
  }
  await pg_query(`CREATE EXTENSION IF NOT EXISTS vector`);
  pgvector_checked = true;
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

export async function save_track_embedding({
  track_id,
  title,
  artist,
  genre,
}) {
  await ensure_pgvector_extension();

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
  await ensure_pgvector_extension();

  const tracks_columns = await get_pg_table_columns("tracks");
  if (tracks_columns.size === 0) {
    throw new Error("PG_TRACKS_TABLE_NOT_FOUND");
  }
  const listening_events_columns = await get_pg_table_columns("listening_events");
  if (listening_events_columns.size === 0) {
    throw new Error("PG_LISTENING_EVENTS_TABLE_NOT_FOUND");
  }

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

  if (
    !tracks_id_column ||
    !tracks_title_column ||
    !tracks_embedding_column ||
    !events_user_id_column ||
    !events_track_id_column ||
    !events_played_at_column
  ) {
    throw new Error("PG_RECOMMENDATIONS_SCHEMA_MISSING_COLUMNS");
  }

  const recommendations_limit = Math.max(config.RECOMMENDATIONS_LIMIT || 20, 1);

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
    return [];
  }

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

  return recommendations_result.rows.map((row) => ({
    track_id: String(row.track_id),
    title: String(row.title ?? "Unknown track"),
    artist: String(row.artist ?? "Unknown artist"),
    genre: row.genre ? String(row.genre) : null,
    distance: to_number(row.distance),
  }));
}
