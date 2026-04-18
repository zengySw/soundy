import { pg_query } from "../db_pg.js";

const supported_search_types = new Set([
  "all",
  "tracks",
  "artists",
  "playlists",
]);

const table_columns_cache = new Map();

function is_safe_identifier(value) {
  return /^[a-z_][a-z0-9_]*$/i.test(String(value || "").trim());
}

function assert_identifier(value) {
  if (!is_safe_identifier(value)) {
    throw new Error("UNSAFE_IDENTIFIER");
  }
  return value;
}

function pick_column(columns, candidates) {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function normalize_text(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function to_rank_number(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function to_limit_number(value, fallback_value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback_value;
  }
  return Math.min(Math.max(parsed, 1), 50);
}

function build_column_ref(alias, column_name) {
  return `${assert_identifier(alias)}.${assert_identifier(column_name)}`;
}

function build_headline_expression(text_expression) {
  return `ts_headline(
    'simple',
    ${text_expression},
    sq.tsquery,
    'StartSel=<mark>, StopSel=</mark>, MaxWords=12, MinWords=1, HighlightAll=true'
  )`;
}

async function get_table_columns(table_name) {
  const normalized_table_name = assert_identifier(table_name).toLowerCase();
  if (table_columns_cache.has(normalized_table_name)) {
    return table_columns_cache.get(normalized_table_name);
  }

  const result = await pg_query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [normalized_table_name],
  );

  const columns = new Set(
    result.rows.map((row) => String(row.column_name).trim().toLowerCase()),
  );
  table_columns_cache.set(normalized_table_name, columns);
  return columns;
}

function build_tracks_vector_expression({
  title_column,
  genre_column,
  search_vector_column,
}) {
  if (search_vector_column) {
    return build_column_ref("t", search_vector_column);
  }
  const title_expression = `COALESCE(${build_column_ref("t", title_column)}::text, '')`;
  const genre_expression = genre_column
    ? `COALESCE(${build_column_ref("t", genre_column)}::text, '')`
    : "''";
  return `to_tsvector('simple', concat_ws(' ', ${title_expression}, ${genre_expression}))`;
}

function build_artists_vector_expression({ name_column, search_vector_column }) {
  if (search_vector_column) {
    return build_column_ref("a", search_vector_column);
  }
  const name_expression = `COALESCE(${build_column_ref("a", name_column)}::text, '')`;
  return `to_tsvector('simple', ${name_expression})`;
}

function build_playlists_vector_expression({
  title_column,
  description_column,
  search_vector_column,
}) {
  if (search_vector_column) {
    return build_column_ref("p", search_vector_column);
  }
  const title_expression = title_column
    ? `COALESCE(${build_column_ref("p", title_column)}::text, '')`
    : "''";
  const description_expression = description_column
    ? `COALESCE(${build_column_ref("p", description_column)}::text, '')`
    : "''";
  return `to_tsvector('simple', concat_ws(' ', ${title_expression}, ${description_expression}))`;
}

async function search_tracks(query_text, search_limit) {
  const tracks_columns = await get_table_columns("tracks");
  if (tracks_columns.size === 0) {
    return [];
  }

  const id_column = pick_column(tracks_columns, ["id", "track_id"]);
  const title_column = pick_column(tracks_columns, ["title", "name"]);
  const genre_column = pick_column(tracks_columns, ["genre"]);
  const search_vector_column = pick_column(tracks_columns, ["search_vector"]);

  if (!id_column || !title_column) {
    return [];
  }

  const title_expression = `COALESCE(${build_column_ref("t", title_column)}::text, '')`;
  const subtitle_expression = genre_column
    ? `COALESCE(${build_column_ref("t", genre_column)}::text, '')`
    : "''";
  const vector_expression = build_tracks_vector_expression({
    title_column,
    genre_column,
    search_vector_column,
  });

  const result = await pg_query(
    `
      WITH search_query AS (
        SELECT plainto_tsquery('simple', $1) AS tsquery
      )
      SELECT
        ${build_column_ref("t", id_column)}::text AS id,
        ${title_expression} AS title,
        ${subtitle_expression} AS subtitle,
        ts_rank(${vector_expression}, sq.tsquery) AS rank,
        ${build_headline_expression(title_expression)} AS highlight,
        ${build_headline_expression(subtitle_expression)} AS subtitle_highlight
      FROM tracks t
      CROSS JOIN search_query sq
      WHERE ${vector_expression} @@ sq.tsquery
      ORDER BY rank DESC, title ASC
      LIMIT $2
    `,
    [query_text, search_limit],
  );

  return result.rows.map((row) => ({
    entity_type: "tracks",
    id: String(row.id),
    title: normalize_text(row.title),
    subtitle: normalize_text(row.subtitle) || null,
    highlight: normalize_text(row.highlight) || null,
    subtitle_highlight: normalize_text(row.subtitle_highlight) || null,
    rank: to_rank_number(row.rank),
  }));
}

async function search_artists(query_text, search_limit) {
  const artists_columns = await get_table_columns("artists");
  if (artists_columns.size === 0) {
    return [];
  }

  const id_column = pick_column(artists_columns, ["id", "artist_id"]);
  const name_column = pick_column(artists_columns, [
    "name",
    "artist_name",
    "title",
  ]);
  const search_vector_column = pick_column(artists_columns, ["search_vector"]);

  if (!id_column || !name_column) {
    return [];
  }

  const title_expression = `COALESCE(${build_column_ref("a", name_column)}::text, '')`;
  const vector_expression = build_artists_vector_expression({
    name_column,
    search_vector_column,
  });

  const result = await pg_query(
    `
      WITH search_query AS (
        SELECT plainto_tsquery('simple', $1) AS tsquery
      )
      SELECT
        ${build_column_ref("a", id_column)}::text AS id,
        ${title_expression} AS title,
        ts_rank(${vector_expression}, sq.tsquery) AS rank,
        ${build_headline_expression(title_expression)} AS highlight
      FROM artists a
      CROSS JOIN search_query sq
      WHERE ${vector_expression} @@ sq.tsquery
      ORDER BY rank DESC, title ASC
      LIMIT $2
    `,
    [query_text, search_limit],
  );

  return result.rows.map((row) => ({
    entity_type: "artists",
    id: String(row.id),
    title: normalize_text(row.title),
    subtitle: null,
    highlight: normalize_text(row.highlight) || null,
    subtitle_highlight: null,
    rank: to_rank_number(row.rank),
  }));
}

async function search_playlists(query_text, search_limit) {
  const playlists_columns = await get_table_columns("playlists");
  if (playlists_columns.size === 0) {
    return [];
  }

  const id_column = pick_column(playlists_columns, ["id", "playlist_id"]);
  const title_column = pick_column(playlists_columns, ["title", "name"]);
  const description_column = pick_column(playlists_columns, [
    "description",
    "details",
  ]);
  const search_vector_column = pick_column(playlists_columns, ["search_vector"]);

  if (!id_column || !title_column) {
    return [];
  }

  const title_expression = `COALESCE(${build_column_ref("p", title_column)}::text, '')`;
  const subtitle_expression = description_column
    ? `COALESCE(${build_column_ref("p", description_column)}::text, '')`
    : "''";
  const vector_expression = build_playlists_vector_expression({
    title_column,
    description_column,
    search_vector_column,
  });

  const result = await pg_query(
    `
      WITH search_query AS (
        SELECT plainto_tsquery('simple', $1) AS tsquery
      )
      SELECT
        ${build_column_ref("p", id_column)}::text AS id,
        ${title_expression} AS title,
        ${subtitle_expression} AS subtitle,
        ts_rank(${vector_expression}, sq.tsquery) AS rank,
        ${build_headline_expression(title_expression)} AS highlight,
        ${build_headline_expression(subtitle_expression)} AS subtitle_highlight
      FROM playlists p
      CROSS JOIN search_query sq
      WHERE ${vector_expression} @@ sq.tsquery
      ORDER BY rank DESC, title ASC
      LIMIT $2
    `,
    [query_text, search_limit],
  );

  return result.rows.map((row) => ({
    entity_type: "playlists",
    id: String(row.id),
    title: normalize_text(row.title),
    subtitle: normalize_text(row.subtitle) || null,
    highlight: normalize_text(row.highlight) || null,
    subtitle_highlight: normalize_text(row.subtitle_highlight) || null,
    rank: to_rank_number(row.rank),
  }));
}

function sort_items_by_rank(items) {
  return [...items].sort((left_item, right_item) => {
    if (right_item.rank !== left_item.rank) {
      return right_item.rank - left_item.rank;
    }
    return left_item.title.localeCompare(right_item.title);
  });
}

export function normalize_search_query(raw_value) {
  if (typeof raw_value !== "string") {
    return "";
  }
  return raw_value.trim().replace(/\s+/g, " ").slice(0, 200);
}

export function resolve_search_type(raw_value) {
  const normalized_type =
    typeof raw_value === "string" ? raw_value.trim().toLowerCase() : "all";
  if (!normalized_type) {
    return "all";
  }
  if (!supported_search_types.has(normalized_type)) {
    throw new Error("INVALID_SEARCH_TYPE");
  }
  return normalized_type;
}

export function resolve_search_limit(raw_value, fallback_limit = 20) {
  if (raw_value === undefined || raw_value === null || raw_value === "") {
    return to_limit_number(fallback_limit, fallback_limit);
  }
  const limit_value = to_limit_number(raw_value, fallback_limit);
  if (!Number.isFinite(limit_value) || limit_value <= 0) {
    throw new Error("INVALID_SEARCH_LIMIT");
  }
  return limit_value;
}

export async function search_catalog({
  query_text,
  search_type,
  search_limit,
}) {
  const normalized_query_text = normalize_search_query(query_text);
  if (!normalized_query_text) {
    return [];
  }

  if (search_type === "tracks") {
    return sort_items_by_rank(
      await search_tracks(normalized_query_text, search_limit),
    );
  }

  if (search_type === "artists") {
    return sort_items_by_rank(
      await search_artists(normalized_query_text, search_limit),
    );
  }

  if (search_type === "playlists") {
    return sort_items_by_rank(
      await search_playlists(normalized_query_text, search_limit),
    );
  }

  const [track_items, artist_items, playlist_items] = await Promise.all([
    search_tracks(normalized_query_text, search_limit),
    search_artists(normalized_query_text, search_limit),
    search_playlists(normalized_query_text, search_limit),
  ]);

  return sort_items_by_rank([
    ...track_items,
    ...artist_items,
    ...playlist_items,
  ]).slice(0, search_limit);
}
