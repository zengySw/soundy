import { poolPromise, sql } from "../db.js";
import { randomUUID } from "crypto";

let cachedArtistColumns = null;
let cachedTrackArtistColumns = null;

async function getTableColumns(pool, tableName, cacheKey) {
  if (cacheKey === "artists" && cachedArtistColumns) {
    return cachedArtistColumns;
  }
  if (cacheKey === "track_artists" && cachedTrackArtistColumns) {
    return cachedTrackArtistColumns;
  }
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}'
  `);
  const columns = new Set(
    result.recordset.map((row) => row.COLUMN_NAME.toLowerCase()),
  );
  if (cacheKey === "artists") {
    cachedArtistColumns = columns;
  } else if (cacheKey === "track_artists") {
    cachedTrackArtistColumns = columns;
  }
  return columns;
}

function pickColumn(columns, candidates) {
  return candidates.find((name) => columns.has(name.toLowerCase()));
}

function applyArtistInput(request, column, value) {
  const key = column.toLowerCase();
  switch (key) {
    case "id":
      return request.input(column, sql.UniqueIdentifier, value);
    case "name":
    case "title":
    case "artist":
    case "artist_name":
      return request.input(column, sql.NVarChar(255), value);
    default:
      return request.input(column, sql.NVarChar(sql.MAX), value);
  }
}

function applyTrackArtistInput(request, column, value) {
  const key = column.toLowerCase();
  switch (key) {
    case "track_id":
    case "trackid":
    case "artist_id":
    case "artistid":
      return request.input(column, sql.UniqueIdentifier, value);
    case "is_main_artist":
    case "is_main":
      return request.input(column, sql.Bit, value ? 1 : 0);
    default:
      return request.input(column, sql.NVarChar(sql.MAX), value);
  }
}

export async function listArtists() {
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "artists", "artists");
  if (columns.size === 0) {
    return [];
  }
  const idCol = pickColumn(columns, ["id", "artist_id"]);
  const nameCol = pickColumn(columns, ["name", "title", "artist", "artist_name"]);
  const createdCol = pickColumn(columns, ["created_at"]);
  if (!idCol || !nameCol) {
    return [];
  }
  const selectColumns = [`${idCol} AS id`, `${nameCol} AS name`];
  const orderBy = createdCol || nameCol;
  const result = await pool.request().query(`
    SELECT TOP (300) ${selectColumns.join(", ")}
    FROM artists
    ORDER BY ${orderBy}
  `);
  return result.recordset;
}

export async function findArtistByName(name) {
  if (!name) {
    return null;
  }
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "artists", "artists");
  const idCol = pickColumn(columns, ["id", "artist_id"]);
  const nameCol = pickColumn(columns, ["name", "title", "artist", "artist_name"]);
  if (!idCol || !nameCol) {
    return null;
  }
  const result = await pool
    .request()
    .input("name", sql.NVarChar(255), name)
    .query(`
      SELECT TOP (1) ${idCol} AS id
      FROM artists
      WHERE ${nameCol} = @name
    `);
  return result.recordset[0] ?? null;
}

export async function createArtist({ name }) {
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "artists", "artists");
  if (columns.size === 0) {
    throw new Error("Artists table not found");
  }
  const idCol = pickColumn(columns, ["id", "artist_id"]);
  const nameCol = pickColumn(columns, ["name", "title", "artist", "artist_name"]);
  if (!idCol || !nameCol) {
    throw new Error("Artists table missing required columns");
  }

  const payload = {
    [idCol]: randomUUID(),
    [nameCol]: name,
  };
  const request = pool.request();
  const columnsList = [];
  const placeholders = [];
  for (const [key, value] of Object.entries(payload)) {
    columnsList.push(key);
    placeholders.push(`@${key}`);
    applyArtistInput(request, key, value);
  }

  await request.query(`
    INSERT INTO artists (${columnsList.join(", ")})
    VALUES (${placeholders.join(", ")})
  `);

  return { id: payload[idCol], name: payload[nameCol] };
}

export async function ensureArtistsByName(names) {
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "artists", "artists");
  const idCol = pickColumn(columns, ["id", "artist_id"]);
  const nameCol = pickColumn(columns, ["name", "title", "artist", "artist_name"]);
  if (!idCol || !nameCol) {
    throw new Error("Artists table missing required columns");
  }

  const unique = Array.from(
    new Map(
      names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name]),
    ).values(),
  );
  if (unique.length === 0) {
    return [];
  }

  const request = pool.request();
  const placeholders = unique.map((name, index) => {
    const key = `name_${index}`;
    request.input(key, sql.NVarChar(255), name);
    return `@${key}`;
  });

  const existing = await request.query(`
    SELECT ${idCol} AS id, ${nameCol} AS name
    FROM artists
    WHERE ${nameCol} IN (${placeholders.join(", ")})
  `);

  const existingMap = new Map(
    existing.recordset.map((row) => [row.name?.toLowerCase?.() ?? "", row.id]),
  );

  const result = [];
  for (const name of unique) {
    const key = name.toLowerCase();
    if (existingMap.has(key)) {
      result.push({ id: existingMap.get(key), name });
      continue;
    }
    const created = await createArtist({ name });
    result.push(created);
  }
  return result;
}

export async function linkTrackArtists(trackId, artists, mainArtistId) {
  if (!trackId || artists.length === 0) {
    return;
  }
  const pool = await poolPromise;
  const columns = await getTableColumns(pool, "track_artists", "track_artists");
  if (columns.size === 0) {
    throw new Error("track_artists table not found");
  }
  const trackCol = pickColumn(columns, ["track_id", "trackid"]);
  const artistCol = pickColumn(columns, ["artist_id", "artistid"]);
  if (!trackCol || !artistCol) {
    throw new Error("track_artists table missing required columns");
  }
  const mainCol = pickColumn(columns, ["is_main_artist", "is_main"]);

  for (const artist of artists) {
    const request = pool.request();
    applyTrackArtistInput(request, trackCol, trackId);
    applyTrackArtistInput(request, artistCol, artist.id);
    if (mainCol) {
      applyTrackArtistInput(request, mainCol, artist.id === mainArtistId);
    }

    const whereClause = `${trackCol} = @${trackCol} AND ${artistCol} = @${artistCol}`;
    const columnsList = [trackCol, artistCol];
    const placeholders = [`@${trackCol}`, `@${artistCol}`];
    if (mainCol) {
      columnsList.push(mainCol);
      placeholders.push(`@${mainCol}`);
    }

    await request.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM track_artists
        WHERE ${whereClause}
      )
      BEGIN
        INSERT INTO track_artists (${columnsList.join(", ")})
        VALUES (${placeholders.join(", ")})
      END
    `);
  }
}

export async function ensureTrackArtists(trackId, artistNames) {
  const artists = await ensureArtistsByName(artistNames);
  if (artists.length === 0) {
    return [];
  }
  const mainArtistId = artists[0]?.id ?? null;
  await linkTrackArtists(trackId, artists, mainArtistId);
  return artists;
}
