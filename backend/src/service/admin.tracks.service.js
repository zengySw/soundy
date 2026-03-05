import { poolPromise, sql } from "../db.js";

export async function listTracksAdmin() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT id, album_id, title, duration_ms, track_number, is_explicit, play_count, path
    FROM tracks
    ORDER BY title
  `);
  return result.recordset;
}

export async function updateTrackPath(id, pathValue) {
  const pool = await poolPromise;
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("path", sql.NVarChar(500), pathValue)
    .query(`
      UPDATE tracks
      SET path = @path
      WHERE id = @id
    `);
}
