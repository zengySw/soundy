import { poolPromise, sql } from "../db.js";

let cachedTrackColumns = null;

async function getTrackColumns(pool) {
  if (cachedTrackColumns) {
    return cachedTrackColumns;
  }
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tracks'
  `);
  cachedTrackColumns = new Set(
    result.recordset.map((row) => row.COLUMN_NAME.toLowerCase()),
  );
  return cachedTrackColumns;
}

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
  const result = await pool
    .request()
    .query(`
      SELECT TOP (100) id, title, path
      FROM tracks
      WHERE path IS NOT NULL
      ORDER BY NEWID()
    `);

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
  const columns = await getTrackColumns(pool);
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
