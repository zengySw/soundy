import { randomUUID } from "crypto";
import { poolPromise, sql } from "../db.js";
import { config } from "../config/env.js";
import { getTableColumns, pickColumn } from "./db-meta.js";

const FAVORITES_PLAYLIST_NAME = config.FAVORITES_PLAYLIST_NAME;

async function getPlaylistColumns(pool) {
  return getTableColumns(pool, "playlists");
}

async function getPlaylistTrackColumns(pool) {
  return getTableColumns(pool, "playlist_tracks");
}

async function getTracksColumns(pool) {
  return getTableColumns(pool, "tracks");
}

export async function listPlaylistsByUser(userId) {
  const pool = await poolPromise;
  const columns = await getPlaylistColumns(pool);
  if (columns.size === 0) {
    return [];
  }

  const idCol = pickColumn(columns, ["id", "playlist_id"]);
  const ownerCol = pickColumn(columns, ["owner_id", "user_id"]);
  const nameCol = pickColumn(columns, ["name", "title"]);
  if (!idCol || !ownerCol || !nameCol) {
    return [];
  }
  const descCol = pickColumn(columns, ["description", "about"]);
  const publicCol = pickColumn(columns, ["is_public", "public"]);
  const createdCol = pickColumn(columns, ["created_at", "created"]);

  const playlistTrackColumns = await getPlaylistTrackColumns(pool);
  const ptPlaylistCol = pickColumn(playlistTrackColumns, ["playlist_id", "playlistid"]);

  const selectCols = [
    `p.${idCol} AS id`,
    `p.${nameCol} AS name`,
    descCol ? `p.${descCol} AS description` : null,
    publicCol ? `p.${publicCol} AS is_public` : null,
    createdCol ? `p.${createdCol} AS created_at` : null,
  ].filter(Boolean);

  let query = `SELECT ${selectCols.join(", ")}`;
  if (ptPlaylistCol) {
    query += ", COALESCE(pt.track_count, 0) AS track_count";
  }
  query += ` FROM playlists p`;
  if (ptPlaylistCol) {
    query += `
      LEFT JOIN (
        SELECT ${ptPlaylistCol} AS playlist_id, COUNT(*) AS track_count
        FROM playlist_tracks
        GROUP BY ${ptPlaylistCol}
      ) AS pt ON pt.playlist_id = p.${idCol}
    `;
  }
  query += ` WHERE p.${ownerCol} = @owner_id`;
  if (FAVORITES_PLAYLIST_NAME) {
    query += ` AND p.${nameCol} <> @favorites_name`;
  }
  const orderBy = createdCol ? `p.${createdCol} DESC` : `p.${nameCol}`;
  query += ` ORDER BY ${orderBy}`;

  const request = pool.request().input("owner_id", sql.UniqueIdentifier, userId);
  if (FAVORITES_PLAYLIST_NAME) {
    request.input("favorites_name", sql.NVarChar(255), FAVORITES_PLAYLIST_NAME);
  }
  const result = await request.query(query);
  return result.recordset;
}

export async function createPlaylist(userId, { name, description, isPublic }) {
  if (!name) {
    throw new Error("PLAYLIST_NAME_REQUIRED");
  }
  const pool = await poolPromise;
  const columns = await getPlaylistColumns(pool);
  if (columns.size === 0) {
    throw new Error("PLAYLISTS_TABLE_NOT_FOUND");
  }
  const idCol = pickColumn(columns, ["id", "playlist_id"]);
  const ownerCol = pickColumn(columns, ["owner_id", "user_id"]);
  const nameCol = pickColumn(columns, ["name", "title"]);
  if (!idCol || !ownerCol || !nameCol) {
    throw new Error("PLAYLISTS_TABLE_MISSING_COLUMNS");
  }
  const descCol = pickColumn(columns, ["description", "about"]);
  const publicCol = pickColumn(columns, ["is_public", "public"]);

  const existing = await pool
    .request()
    .input("owner_id", sql.UniqueIdentifier, userId)
    .input("name", sql.NVarChar(255), name)
    .query(`
      SELECT TOP (1) ${idCol} AS id
      FROM playlists
      WHERE ${ownerCol} = @owner_id AND ${nameCol} = @name
    `);
  if (existing.recordset[0]) {
    return { exists: true, id: existing.recordset[0].id };
  }

  const payload = {
    [idCol]: randomUUID(),
    [ownerCol]: userId,
    [nameCol]: name,
  };
  if (descCol && description) {
    payload[descCol] = description;
  }
  if (publicCol !== undefined) {
    payload[publicCol] = isPublic ? 1 : 0;
  }

  const request = pool.request();
  const cols = [];
  const values = [];
  for (const [key, value] of Object.entries(payload)) {
    cols.push(key);
    values.push(`@${key}`);
    if (key === idCol || key === ownerCol) {
      request.input(key, sql.UniqueIdentifier, value);
    } else if (key === publicCol) {
      request.input(key, sql.Bit, value ? 1 : 0);
    } else {
      request.input(key, sql.NVarChar(255), value);
    }
  }

  await request.query(`
    INSERT INTO playlists (${cols.join(", ")})
    VALUES (${values.join(", ")})
  `);

  return { id: payload[idCol], name };
}

export async function getPlaylistWithTracks(userId, playlistId) {
  const pool = await poolPromise;
  const playlistColumns = await getPlaylistColumns(pool);
  if (playlistColumns.size === 0) {
    return null;
  }
  const idCol = pickColumn(playlistColumns, ["id", "playlist_id"]);
  const ownerCol = pickColumn(playlistColumns, ["owner_id", "user_id"]);
  const nameCol = pickColumn(playlistColumns, ["name", "title"]);
  if (!idCol || !ownerCol || !nameCol) {
    return null;
  }
  const descCol = pickColumn(playlistColumns, ["description", "about"]);
  const publicCol = pickColumn(playlistColumns, ["is_public", "public"]);

  const playlistResult = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("owner_id", sql.UniqueIdentifier, userId)
    .query(`
      SELECT TOP (1)
        ${idCol} AS id,
        ${nameCol} AS name
        ${descCol ? `, ${descCol} AS description` : ""}
        ${publicCol ? `, ${publicCol} AS is_public` : ""}
      FROM playlists
      WHERE ${idCol} = @playlist_id AND ${ownerCol} = @owner_id
    `);

  const playlist = playlistResult.recordset[0];
  if (!playlist) {
    return null;
  }

  const playlistTrackColumns = await getPlaylistTrackColumns(pool);
  const ptPlaylistCol = pickColumn(playlistTrackColumns, ["playlist_id", "playlistid"]);
  const ptTrackCol = pickColumn(playlistTrackColumns, ["track_id", "trackid"]);
  const ptAddedCol = pickColumn(playlistTrackColumns, ["added_at", "created_at", "created"]);
  const trackColumns = await getTracksColumns(pool);
  const trackIdCol = pickColumn(trackColumns, ["id", "track_id"]);
  const trackTitleCol = pickColumn(trackColumns, ["title", "name"]);
  const trackDurationCol = pickColumn(trackColumns, ["duration_ms", "duration"]);
  const trackPathCol = pickColumn(trackColumns, ["path"]);

  if (!ptPlaylistCol || !ptTrackCol || !trackIdCol || !trackTitleCol) {
    return { ...playlist, tracks: [] };
  }

  const trackSelect = [
    `t.${trackIdCol} AS id`,
    `t.${trackTitleCol} AS title`,
    trackDurationCol ? `t.${trackDurationCol} AS duration_ms` : null,
    trackPathCol ? `t.${trackPathCol} AS path` : null,
    ptAddedCol ? `pt.${ptAddedCol} AS added_at` : null,
  ].filter(Boolean);

  const orderBy = ptAddedCol ? `pt.${ptAddedCol} DESC` : `t.${trackTitleCol}`;
  const tracksResult = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .query(`
      SELECT ${trackSelect.join(", ")}
      FROM playlist_tracks pt
      INNER JOIN tracks t ON t.${trackIdCol} = pt.${ptTrackCol}
      WHERE pt.${ptPlaylistCol} = @playlist_id
      ORDER BY ${orderBy}
    `);

  return { ...playlist, tracks: tracksResult.recordset };
}

export async function addTrackToPlaylist(userId, playlistId, trackId) {
  if (!playlistId || !trackId) {
    throw new Error("PLAYLIST_TRACK_REQUIRED");
  }
  const pool = await poolPromise;
  const playlistColumns = await getPlaylistColumns(pool);
  if (playlistColumns.size === 0) {
    throw new Error("PLAYLISTS_TABLE_NOT_FOUND");
  }
  const idCol = pickColumn(playlistColumns, ["id", "playlist_id"]);
  const ownerCol = pickColumn(playlistColumns, ["owner_id", "user_id"]);
  if (!idCol || !ownerCol) {
    throw new Error("PLAYLISTS_TABLE_MISSING_COLUMNS");
  }

  const playlistCheck = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("owner_id", sql.UniqueIdentifier, userId)
    .query(`
      SELECT TOP (1) ${idCol} AS id
      FROM playlists
      WHERE ${idCol} = @playlist_id AND ${ownerCol} = @owner_id
    `);

  if (!playlistCheck.recordset[0]) {
    return { notFound: true };
  }

  const playlistTrackColumns = await getPlaylistTrackColumns(pool);
  const ptPlaylistCol = pickColumn(playlistTrackColumns, ["playlist_id", "playlistid"]);
  const ptTrackCol = pickColumn(playlistTrackColumns, ["track_id", "trackid"]);
  const ptAddedCol = pickColumn(playlistTrackColumns, ["added_at", "created_at", "created"]);
  if (!ptPlaylistCol || !ptTrackCol) {
    throw new Error("PLAYLIST_TRACKS_TABLE_MISSING_COLUMNS");
  }

  const insertCols = [ptPlaylistCol, ptTrackCol];
  const insertValues = ["@playlist_id", "@track_id"];
  if (ptAddedCol) {
    insertCols.push(ptAddedCol);
    insertValues.push("SYSUTCDATETIME()");
  }

  const result = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("track_id", sql.UniqueIdentifier, trackId)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM playlist_tracks
        WHERE ${ptPlaylistCol} = @playlist_id AND ${ptTrackCol} = @track_id
      )
      BEGIN
        INSERT INTO playlist_tracks (${insertCols.join(", ")})
        VALUES (${insertValues.join(", ")})
        SELECT 1 AS added
      END
      ELSE
      BEGIN
        SELECT 0 AS added
      END
    `);

  return { added: result.recordset[0]?.added === 1 };
}

export async function removeTrackFromPlaylist(userId, playlistId, trackId) {
  if (!playlistId || !trackId) {
    throw new Error("PLAYLIST_TRACK_REQUIRED");
  }
  const pool = await poolPromise;
  const playlistColumns = await getPlaylistColumns(pool);
  if (playlistColumns.size === 0) {
    throw new Error("PLAYLISTS_TABLE_NOT_FOUND");
  }
  const idCol = pickColumn(playlistColumns, ["id", "playlist_id"]);
  const ownerCol = pickColumn(playlistColumns, ["owner_id", "user_id"]);
  if (!idCol || !ownerCol) {
    throw new Error("PLAYLISTS_TABLE_MISSING_COLUMNS");
  }

  const playlistCheck = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("owner_id", sql.UniqueIdentifier, userId)
    .query(`
      SELECT TOP (1) ${idCol} AS id
      FROM playlists
      WHERE ${idCol} = @playlist_id AND ${ownerCol} = @owner_id
    `);

  if (!playlistCheck.recordset[0]) {
    return { notFound: true };
  }

  const playlistTrackColumns = await getPlaylistTrackColumns(pool);
  const ptPlaylistCol = pickColumn(playlistTrackColumns, ["playlist_id", "playlistid"]);
  const ptTrackCol = pickColumn(playlistTrackColumns, ["track_id", "trackid"]);
  if (!ptPlaylistCol || !ptTrackCol) {
    throw new Error("PLAYLIST_TRACKS_TABLE_MISSING_COLUMNS");
  }

  const result = await pool
    .request()
    .input("playlist_id", sql.UniqueIdentifier, playlistId)
    .input("track_id", sql.UniqueIdentifier, trackId)
    .query(`
      DELETE FROM playlist_tracks
      WHERE ${ptPlaylistCol} = @playlist_id AND ${ptTrackCol} = @track_id;
      SELECT @@ROWCOUNT AS removed;
    `);

  return { removed: result.recordset[0]?.removed > 0 };
}
