import { poolPromise, sql } from "../db.js";
import { randomUUID } from "crypto";
import { getTableColumns, pickColumn } from "./db-meta.js";

async function getAlbumColumns(pool) {
  return getTableColumns(pool, "albums");
}

function applyInput(request, column, value) {
  switch (column) {
    case "id":
    case "album_id":
      return request.input(column, sql.UniqueIdentifier, value);
    case "title":
    case "name":
    case "artist":
    case "artist_name":
    case "cover_path":
    case "cover_url":
    case "cover":
      return request.input(column, sql.NVarChar(500), value);
    case "year":
    case "release_year":
      return request.input(column, sql.Int, value);
    default:
      return request.input(column, sql.NVarChar(sql.MAX), value);
  }
}

export async function listAlbums() {
  const pool = await poolPromise;
  const columns = await getAlbumColumns(pool);
  if (columns.size === 0) {
    return [];
  }

  const idCol = pickColumn(columns, ["id"]);
  if (!idCol) {
    return [];
  }
  const titleCol = pickColumn(columns, ["title", "name"]);
  const artistCol = pickColumn(columns, ["artist", "artist_name"]);
  const yearCol = pickColumn(columns, ["year", "release_year"]);
  const coverCol = pickColumn(columns, ["cover_path", "cover_url", "cover"]);
  const createdCol = pickColumn(columns, ["created_at"]);

  const selectColumns = [
    idCol,
    titleCol,
    artistCol,
    yearCol,
    coverCol,
    createdCol,
  ].filter(Boolean);
  const orderBy = titleCol || createdCol || idCol;

  const trackColumns = await getTableColumns(pool, "tracks");
  const trackAlbumCol = pickColumn(trackColumns, ["album_id"]);
  const selectWithAlias = selectColumns.map((col) => `a.${col}`);

  let query = `SELECT TOP (200) ${selectWithAlias.join(", ")}`;
  if (trackAlbumCol) {
    query += `
      , track_counts.track_count
      , CASE
          WHEN track_counts.track_count = 1 THEN 'single'
          WHEN track_counts.track_count > 1 THEN 'album'
          ELSE NULL
        END AS release_type
    `;
  }
  query += " FROM albums a";
  if (trackAlbumCol) {
    query += `
      LEFT JOIN (
        SELECT ${trackAlbumCol} AS album_id, COUNT(*) AS track_count
        FROM tracks
        GROUP BY ${trackAlbumCol}
      ) AS track_counts ON track_counts.album_id = a.${idCol}
    `;
  }
  query += ` ORDER BY a.${orderBy}`;

  const result = await pool.request().query(query);
  return result.recordset;
}

export async function findAlbumByTitle(title, artist) {
  if (!title) {
    return null;
  }
  const pool = await poolPromise;
  const columns = await getAlbumColumns(pool);
  if (columns.size === 0) {
    return null;
  }
  const idCol = pickColumn(columns, ["id"]);
  const titleCol = pickColumn(columns, ["title", "name"]);
  const artistCol = pickColumn(columns, ["artist", "artist_name"]);
  if (!idCol || !titleCol) {
    return null;
  }
  let query = `
    SELECT TOP (1) ${idCol} AS id
    FROM albums
    WHERE ${titleCol} = @title
  `;
  const request = pool.request().input("title", sql.NVarChar(255), title);
  if (artistCol && artist) {
    query += ` AND ${artistCol} = @artist`;
    request.input("artist", sql.NVarChar(255), artist);
  }
  const result = await request.query(query);
  return result.recordset[0] ?? null;
}

export async function getAlbumById(id) {
  if (!id) {
    return null;
  }
  const pool = await poolPromise;
  const columns = await getAlbumColumns(pool);
  if (columns.size === 0) {
    return null;
  }
  const idCol = pickColumn(columns, ["id"]);
  if (!idCol) {
    return null;
  }
  const titleCol = pickColumn(columns, ["title", "name"]);
  const artistCol = pickColumn(columns, ["artist", "artist_name"]);
  const selectColumns = [`${idCol} AS id`];
  if (titleCol) {
    selectColumns.push(`${titleCol} AS title`);
  }
  if (artistCol) {
    selectColumns.push(`${artistCol} AS artist`);
  }

  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`
      SELECT TOP (1) ${selectColumns.join(", ")}
      FROM albums
      WHERE ${idCol} = @id
    `);

  return result.recordset[0] ?? null;
}

export async function createAlbum({ title, artist, year, coverPath }) {
  const pool = await poolPromise;
  const columns = await getAlbumColumns(pool);
  if (columns.size === 0) {
    throw new Error("Albums table not found");
  }

  const idCol = pickColumn(columns, ["id"]);
  const titleCol = pickColumn(columns, ["title", "name"]);
  if (!idCol || !titleCol) {
    throw new Error("Albums table missing required columns");
  }
  const artistCol = pickColumn(columns, ["artist", "artist_name"]);
  const yearCol = pickColumn(columns, ["year", "release_year"]);
  const coverCol = pickColumn(columns, ["cover_path", "cover_url", "cover"]);

  const payload = {
    [idCol]: randomUUID(),
    [titleCol]: title,
  };
  if (artistCol && artist) {
    payload[artistCol] = artist;
  }
  if (yearCol && Number.isFinite(year)) {
    payload[yearCol] = year;
  }
  if (coverCol && coverPath) {
    payload[coverCol] = coverPath;
  }

  const request = pool.request();
  const columnsList = [];
  const placeholders = [];
  for (const [key, value] of Object.entries(payload)) {
    columnsList.push(key);
    placeholders.push(`@${key}`);
    applyInput(request, key, value);
  }

  await request.query(`
    INSERT INTO albums (${columnsList.join(", ")})
    VALUES (${placeholders.join(", ")})
  `);

  return { id: payload[idCol], title: payload[titleCol], artist, year };
}
