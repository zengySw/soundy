import { poolPromise, sql } from "../db.js";
import { getTableColumns, pickColumn } from "./db-meta.js";

function applyInput(request, column, value) {
  switch (column) {
    case "id":
    case "album_id":
      return request.input(column, sql.UniqueIdentifier, value);
    case "title":
      return request.input(column, sql.NVarChar(255), value);
    case "path":
      return request.input(column, sql.NVarChar(500), value);
    case "duration_ms":
    case "track_number":
    case "play_count":
      return request.input(column, sql.Int, value);
    case "is_explicit":
      return request.input(column, sql.Bit, value);
    default:
      return request.input(column, sql.NVarChar(sql.MAX), value);
  }
}

export async function getTracksWithPaths() {
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "tracks");
  const selectColumns = ["t.id", "t.title", "t.path"];
  if (columns.has("album_id")) {
    selectColumns.push("t.album_id");
  }
  if (columns.has("artist")) {
    selectColumns.push("t.artist");
  }
  if (columns.has("artist_name")) {
    selectColumns.push("t.artist_name");
  }

  const albumColumns = await getTableColumns(pool, "albums");
  const albumTitleCol = pickColumn(albumColumns, ["title", "name"]);
  const albumArtistCol = pickColumn(albumColumns, ["artist", "artist_name"]);

  const artistColumns = await getTableColumns(pool, "artists");
  const trackArtistColumns = await getTableColumns(pool, "track_artists");
  const artistIdCol = pickColumn(artistColumns, ["id", "artist_id"]);
  const artistNameCol = pickColumn(artistColumns, ["name", "title", "artist", "artist_name"]);
  const taTrackCol = pickColumn(trackArtistColumns, ["track_id", "trackid"]);
  const taArtistCol = pickColumn(trackArtistColumns, ["artist_id", "artistid"]);
  const taMainCol = pickColumn(trackArtistColumns, ["is_main_artist", "is_main"]);

  let query = `SELECT TOP (100) ${selectColumns.join(", ")}`;
  if (columns.has("album_id") && albumTitleCol) {
    query += `, a.${albumTitleCol} AS album_title`;
  }
  if (columns.has("album_id") && albumArtistCol) {
    query += `, a.${albumArtistCol} AS album_artist`;
  }
  if (artistIdCol && artistNameCol && taTrackCol && taArtistCol) {
    query += ", artist_lookup.track_artist_name";
  }
  query += " FROM tracks t";
  if (columns.has("album_id")) {
    query += " LEFT JOIN albums a ON a.id = t.album_id";
  }
  if (artistIdCol && artistNameCol && taTrackCol && taArtistCol) {
    const orderByMain = taMainCol
      ? `CASE WHEN ta.${taMainCol} = 1 THEN 0 ELSE 1 END`
      : "0";
    query += `
      OUTER APPLY (
        SELECT TOP (1) ar.${artistNameCol} AS track_artist_name
        FROM track_artists ta
        INNER JOIN artists ar ON ar.${artistIdCol} = ta.${taArtistCol}
        WHERE ta.${taTrackCol} = t.id
        ORDER BY ${orderByMain}, ar.${artistNameCol}
      ) AS artist_lookup
    `;
  }
  query += " WHERE t.path IS NOT NULL ORDER BY NEWID()";

  const result = await pool.request().query(query);
  return result.recordset;
}

export async function getTrackPathById(id) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`
      SELECT id, path
      FROM tracks
      WHERE id = @id
    `);

  return result.recordset[0] ?? null;
}

export async function insertTrack(payload) {
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "tracks");
  const entries = Object.entries(payload).filter(([key]) =>
    columns.has(key.toLowerCase()),
  );
  if (entries.length === 0) {
    throw new Error("No valid track columns for insert");
  }

  const request = pool.request();
  const columnNames = [];
  const placeholders = [];

  for (const [key, value] of entries) {
    columnNames.push(key);
    placeholders.push(`@${key}`);
    applyInput(request, key, value);
  }

  await request.query(`
    INSERT INTO tracks (${columnNames.join(", ")})
    VALUES (${placeholders.join(", ")})
  `);
}
