import { poolPromise, sql } from "../db.js";
import { config } from "../config/env.js";

const FAVORITES_PLAYLIST_NAME = config.FAVORITES_PLAYLIST_NAME;

async function getFavoritesPlaylistId(pool, userId) {
  const result = await pool
    .request()
    .input("owner_id", sql.UniqueIdentifier, userId)
    .input("playlist_name", sql.NVarChar(255), FAVORITES_PLAYLIST_NAME)
    .query(`
      SELECT id
      FROM playlists
      WHERE owner_id = @owner_id AND name = @playlist_name
    `);

  return result.recordset[0]?.id ?? null;
}

export async function listFavoritesByUser(userId) {
  const pool = await poolPromise;
  const playlistId = await getFavoritesPlaylistId(pool, userId);
  if (!playlistId) {
    return [];
  }
  const result = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .query(`
      SELECT
        t.id,
        t.title,
        t.duration_ms,
        t.path,
        pt.added_at
      FROM playlist_tracks pt
      INNER JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id = @playlist_id
      ORDER BY pt.added_at DESC
    `);

  return result.recordset;
}

export async function addFavorite(userId, trackId) {
  const pool = await poolPromise;
  const playlistId = await getFavoritesPlaylistId(pool, userId);
  if (!playlistId) {
    throw new Error("FAVORITES_PLAYLIST_NOT_FOUND");
  }
  await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("track_id", sql.UniqueIdentifier, trackId)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM playlist_tracks
        WHERE playlist_id = @playlist_id AND track_id = @track_id
      )
      BEGIN
        INSERT INTO playlist_tracks (playlist_id, track_id)
        VALUES (@playlist_id, @track_id)
      END
    `);
}

export async function removeFavorite(userId, trackId) {
  const pool = await poolPromise;
  const playlistId = await getFavoritesPlaylistId(pool, userId);
  if (!playlistId) {
    return;
  }
  await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("track_id", sql.UniqueIdentifier, trackId)
    .query(`
      DELETE FROM playlist_tracks
      WHERE playlist_id = @playlist_id AND track_id = @track_id
    `);
}
