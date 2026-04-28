import fs from "fs/promises";
import path from "path";
import { parseFile } from "music-metadata";
import { config } from "../config/env.js";
import { pg_query } from "../db_pg.js";
import {
  get_media_driver,
  normalize_media_key,
  resolve_ads_read_payload,
  resolve_media_read_payload,
} from "./media_storage.service.js";

const audio_extensions = new Set([
  ".opus",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
]);

const image_extensions = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const preferred_audio_names = ["music.opus", "music.mp3", "source.mp3"];
const preferred_cover_names = ["cover.webp", "cover.jpg", "cover.jpeg", "cover.png"];
const sync_interval_ms = 30_000;

let sync_promise = null;
let last_sync_at = 0;

function normalize_relative_path(input_path) {
  return normalize_media_key(input_path);
}

function get_tracks_base_dir() {
  return path.resolve(config.TRACKS_BASE_DIR);
}

function normalize_track_title(input_title, fallback_value) {
  const cleaned_title = String(input_title || "").trim();
  if (cleaned_title) {
    return cleaned_title.slice(0, 255);
  }
  return String(fallback_value || "Unknown track").slice(0, 255);
}

function normalize_track_artist(input_artist) {
  const cleaned_artist = String(input_artist || "").trim();
  if (!cleaned_artist) {
    return "Unknown artist";
  }
  return cleaned_artist.slice(0, 255);
}

function sanitize_integer(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function pick_preferred_file(file_names, preferred_names, extensions) {
  const normalized_by_lower_name = new Map(
    file_names.map((file_name) => [file_name.toLowerCase(), file_name]),
  );

  for (const preferred_name of preferred_names) {
    const found = normalized_by_lower_name.get(preferred_name.toLowerCase());
    if (found) {
      return found;
    }
  }

  return (
    file_names.find((file_name) =>
      extensions.has(path.extname(file_name).toLowerCase()),
    ) ?? null
  );
}

function format_fallback_title_from_folder(folder_name) {
  const cleaned = String(folder_name || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Unknown track";
}

async function collect_track_candidates(current_dir, output) {
  let entries = [];
  try {
    entries = await fs.readdir(current_dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }

  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const subdirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  const audio_file_name = pick_preferred_file(files, preferred_audio_names, audio_extensions);
  if (audio_file_name) {
    const relative_dir = normalize_relative_path(path.relative(get_tracks_base_dir(), current_dir));
    const is_ad_folder = relative_dir.toLowerCase() === "ad";
    if (!is_ad_folder) {
      const cover_file_name = pick_preferred_file(files, preferred_cover_names, image_extensions);
      output.push({
        dir: current_dir,
        relative_dir,
        audio_file_name,
        cover_file_name,
      });
    }
  }

  for (const subdir_name of subdirs) {
    const nested_dir = path.join(current_dir, subdir_name);
    await collect_track_candidates(nested_dir, output);
  }
}

async function ensure_artist_id(artist_name) {
  const normalized_artist_name = normalize_track_artist(artist_name);
  if (!normalized_artist_name || normalized_artist_name === "Unknown artist") {
    return null;
  }

  const result = await pg_query(
    `
      INSERT INTO artists (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [normalized_artist_name],
  );

  return result.rows[0]?.id ?? null;
}

async function sync_single_track(candidate) {
  const audio_absolute_path = path.join(candidate.dir, candidate.audio_file_name);
  const audio_relative_path = normalize_relative_path(
    path.join(candidate.relative_dir, candidate.audio_file_name),
  );
  const cover_relative_path = candidate.cover_file_name
    ? normalize_relative_path(path.join(candidate.relative_dir, candidate.cover_file_name))
    : null;

  let metadata = null;
  try {
    metadata = await parseFile(audio_absolute_path);
  } catch {
    metadata = null;
  }

  const fallback_title = format_fallback_title_from_folder(
    path.basename(candidate.relative_dir || path.dirname(audio_relative_path)),
  );

  const title = normalize_track_title(metadata?.common?.title, fallback_title);
  const artist = normalize_track_artist(metadata?.common?.artist);
  const album = String(metadata?.common?.album || "").trim() || null;
  const year = sanitize_integer(metadata?.common?.year);
  const genre =
    Array.isArray(metadata?.common?.genre) && metadata.common.genre.length > 0
      ? String(metadata.common.genre[0]).trim() || null
      : null;
  const duration_ms =
    typeof metadata?.format?.duration === "number" && Number.isFinite(metadata.format.duration)
      ? Math.max(0, Math.round(metadata.format.duration * 1000))
      : null;
  const track_number = sanitize_integer(metadata?.common?.track?.no);
  const is_explicit = Boolean(metadata?.common?.explicit);

  const artist_id = await ensure_artist_id(artist);

  await pg_query(
    `
      INSERT INTO tracks (
        album_id,
        artist_id,
        title,
        artist,
        album,
        year,
        genre,
        duration_ms,
        track_number,
        is_explicit,
        path,
        cover_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (path)
      DO UPDATE SET
        artist_id = EXCLUDED.artist_id,
        title = EXCLUDED.title,
        artist = EXCLUDED.artist,
        album = EXCLUDED.album,
        year = EXCLUDED.year,
        genre = EXCLUDED.genre,
        duration_ms = EXCLUDED.duration_ms,
        track_number = EXCLUDED.track_number,
        is_explicit = EXCLUDED.is_explicit,
        cover_path = EXCLUDED.cover_path
    `,
    [
      null,
      artist_id,
      title,
      artist,
      album,
      year,
      genre,
      duration_ms,
      track_number,
      is_explicit,
      audio_relative_path,
      cover_relative_path,
    ],
  );
}

async function perform_tracks_sync() {
  const tracks_base_dir = get_tracks_base_dir();
  const candidates = [];
  await collect_track_candidates(tracks_base_dir, candidates);

  for (const candidate of candidates) {
    await sync_single_track(candidate);
  }

  last_sync_at = Date.now();
}

export async function sync_tracks_from_filesystem({ force = false } = {}) {
  if (sync_promise) {
    return sync_promise;
  }

  const now = Date.now();
  if (!force && now - last_sync_at < sync_interval_ms) {
    return;
  }

  sync_promise = perform_tracks_sync()
    .catch((error) => {
      console.error("Tracks sync failed:", error);
      throw error;
    })
    .finally(() => {
      sync_promise = null;
    });

  return sync_promise;
}

export async function ensure_tracks_seeded() {
  const result = await pg_query("SELECT COUNT(*)::int AS count FROM tracks");
  const count = Number(result.rows[0]?.count || 0);
  if (count > 0) {
    return;
  }
  if (get_media_driver() === "r2") {
    return;
  }
  await sync_tracks_from_filesystem({ force: true });
}

function map_track_row_to_public(row, backend_base_url) {
  return {
    id: String(row.id),
    title: String(row.title || "Unknown track"),
    artist: String(row.artist || "Unknown artist"),
    album: row.album ? String(row.album) : null,
    year: typeof row.year === "number" ? row.year : sanitize_integer(row.year),
    genre: row.genre ? String(row.genre) : null,
    durationMs: sanitize_integer(row.duration_ms),
    cover:
      row.cover_path && backend_base_url
        ? `${backend_base_url}/tracks/${row.id}/cover`
        : null,
  };
}

export async function list_tracks_for_frontend(backend_base_url) {
  await ensure_tracks_seeded();

  const result = await pg_query(
    `
      SELECT id, title, artist, album, year, genre, duration_ms, cover_path
      FROM tracks
      ORDER BY created_at DESC, title ASC
    `,
  );

  return result.rows.map((row) => map_track_row_to_public(row, backend_base_url));
}

export async function get_track_file_payload(track_id) {
  const result = await pg_query(
    `
      SELECT id, path, cover_path, artist_id
      FROM tracks
      WHERE id::text = $1
      LIMIT 1
    `,
    [track_id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    path: normalize_media_key(row.path),
    cover_path: row.cover_path ? normalize_media_key(row.cover_path) : null,
    artist_id: row.artist_id ? String(row.artist_id) : null,
  };
}

export async function resolve_track_audio_absolute_path(track_id) {
  const track = await get_track_file_payload(track_id);
  if (!track?.path) {
    return null;
  }

  const media_payload = await resolve_media_read_payload(track.path);
  if (!media_payload) {
    return null;
  }

  return { ...media_payload, track };
}

export async function resolve_track_cover_absolute_path(track_id) {
  const track = await get_track_file_payload(track_id);
  if (!track?.cover_path) {
    return null;
  }

  const media_payload = await resolve_media_read_payload(track.cover_path);
  if (!media_payload) {
    return null;
  }

  return { ...media_payload, track };
}

export async function resolve_ads_audio_absolute_path() {
  const ad_candidates = ["ad/ads.opus", "ad/ads.wav"];
  return resolve_ads_read_payload(ad_candidates);
}

export async function increment_track_play_count(track_id) {
  await pg_query(
    `
      UPDATE tracks
      SET play_count = play_count + 1
      WHERE id::text = $1
    `,
    [track_id],
  );
}
