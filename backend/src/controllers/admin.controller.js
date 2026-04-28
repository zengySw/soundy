import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { parseFile } from "music-metadata";
import { pg_query } from "../db_pg.js";
import {
  normalize_media_key,
  upload_temp_file_to_media_storage,
} from "../service/media_storage.service.js";

const max_cover_size_bytes = 15 * 1024 * 1024;

function to_int_or_null(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function normalize_text(value, max_length = 255) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, max_length);
}

function normalize_boolean(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalize_relative_path(file_path) {
  return normalize_media_key(file_path);
}

async function remove_file_silent(file_path) {
  if (!file_path) {
    return;
  }
  try {
    await fs.unlink(file_path);
  } catch {
    // no-op
  }
}

async function ensure_artist_id(artist_name) {
  const normalized_artist_name = normalize_text(artist_name, 255);
  if (!normalized_artist_name) {
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

async function ensure_album_id({
  album_id,
  album_title,
  album_artist,
  album_year,
}) {
  const normalized_album_id = String(album_id ?? "").trim();
  if (normalized_album_id) {
    const existing = await pg_query(
      `
        SELECT id::text AS id
        FROM albums
        WHERE id::text = $1
        LIMIT 1
      `,
      [normalized_album_id],
    );
    if (existing.rows[0]?.id) {
      return String(existing.rows[0].id);
    }
  }

  const title = normalize_text(album_title, 255);
  if (!title) {
    return null;
  }

  const artist = normalize_text(album_artist, 255) || null;
  const year = to_int_or_null(album_year);

  const created = await pg_query(
    `
      INSERT INTO albums (title, artist, year)
      VALUES ($1, $2, $3)
      RETURNING id::text AS id
    `,
    [title, artist, year],
  );
  return created.rows[0]?.id ?? null;
}

function get_audio_upload(req) {
  return req.files?.audio?.[0] ?? null;
}

function get_cover_upload(req) {
  return req.files?.cover?.[0] ?? null;
}

export async function get_admin_me(req, res) {
  return res.json({
    userId: req.admin?.userId ?? null,
    role: req.admin?.role ?? "owner",
    note: null,
  });
}

export async function get_admin_tracks(_req, res) {
  try {
    const result = await pg_query(
      `
        SELECT
          id::text AS id,
          album_id::text AS album_id,
          title,
          duration_ms,
          track_number,
          is_explicit,
          play_count,
          path
        FROM tracks
        ORDER BY created_at DESC
      `,
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Admin tracks error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function get_admin_users(_req, res) {
  try {
    const result = await pg_query(
      `
        SELECT
          id::text AS id,
          username,
          email,
          is_premium,
          country_code,
          is_active,
          created_at
        FROM users
        ORDER BY created_at DESC
      `,
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function get_admin_admins(req, res) {
  return res.json([
    {
      user_id: req.admin?.userId ?? null,
      role: req.admin?.role ?? "owner",
      granted_at: null,
      granted_by: null,
      note: "OTP session admin",
    },
  ]);
}

export async function get_admin_albums(_req, res) {
  try {
    const result = await pg_query(
      `
        SELECT
          id::text AS id,
          title,
          artist,
          year,
          cover_path,
          created_at
        FROM albums
        ORDER BY created_at DESC
      `,
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Admin albums error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function post_admin_album(req, res) {
  try {
    const title = normalize_text(req.body?.title, 255);
    if (!title) {
      return res.status(400).json({ message: "Album title is required" });
    }

    const artist = normalize_text(req.body?.artist, 255) || null;
    const year = to_int_or_null(req.body?.year);
    const result = await pg_query(
      `
        INSERT INTO albums (title, artist, year)
        VALUES ($1, $2, $3)
        RETURNING
          id::text AS id,
          title,
          artist,
          year,
          cover_path
      `,
      [title, artist, year],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Admin create album error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function get_admin_artists(_req, res) {
  try {
    const result = await pg_query(
      `
        SELECT
          id::text AS id,
          name
        FROM artists
        ORDER BY name ASC
      `,
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Admin artists error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function post_admin_artist(req, res) {
  try {
    const name = normalize_text(req.body?.name, 255);
    if (!name) {
      return res.status(400).json({ message: "Artist name is required" });
    }

    const result = await pg_query(
      `
        INSERT INTO artists (name)
        VALUES ($1)
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id::text AS id, name
      `,
      [name],
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Admin create artist error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function post_admin_convert_track(req, res) {
  const id = String(req.body?.id || "").trim();
  const source_path = String(req.body?.sourcePath || "").trim();

  if (!id) {
    return res.status(400).json({ message: "Track id is required" });
  }

  try {
    if (source_path) {
      await pg_query(
        `
          UPDATE tracks
          SET path = $2
          WHERE id::text = $1
        `,
        [id, source_path],
      );
    }
    return res.json({
      id,
      path: source_path || null,
      converted: false,
    });
  } catch (error) {
    console.error("Admin convert track error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function post_admin_convert_auto(_req, res) {
  return res.json({
    processed: 0,
    updated: 0,
  });
}

export async function post_admin_track_upload(req, res) {
  const audio_upload = get_audio_upload(req);
  const cover_upload = get_cover_upload(req);

  if (!audio_upload) {
    if (cover_upload) {
      await remove_file_silent(cover_upload.path);
    }
    return res.status(400).json({ message: "Audio file is required" });
  }

  try {
    if (cover_upload && Number(cover_upload.size || 0) > max_cover_size_bytes) {
      throw new Error("COVER_TOO_LARGE");
    }

    const audio_ext = (path.extname(audio_upload.originalname) || ".bin").toLowerCase();
    const target_audio_name = audio_ext === ".opus" ? "music.opus" : `source${audio_ext}`;
    const track_folder_id = randomUUID();
    const track_relative_path = normalize_relative_path(
      path.join("uploads", track_folder_id, target_audio_name),
    );

    let cover_relative_path = null;
    if (cover_upload) {
      const cover_ext = (path.extname(cover_upload.originalname) || ".jpg").toLowerCase();
      const target_cover_name = `cover${cover_ext}`;
      cover_relative_path = normalize_relative_path(
        path.join("uploads", track_folder_id, target_cover_name),
      );
    }

    let metadata = null;
    try {
      metadata = await parseFile(audio_upload.path);
    } catch {
      metadata = null;
    }

    await upload_temp_file_to_media_storage({
      temp_file_path: audio_upload.path,
      media_key: track_relative_path,
      content_type: String(audio_upload.mimetype || "").trim(),
    });
    if (cover_upload && cover_relative_path) {
      await upload_temp_file_to_media_storage({
        temp_file_path: cover_upload.path,
        media_key: cover_relative_path,
        content_type: String(cover_upload.mimetype || "").trim(),
      });
    }

    const title =
      normalize_text(req.body?.title, 255)
      || normalize_text(metadata?.common?.title, 255)
      || normalize_text(path.parse(audio_upload.originalname).name, 255)
      || "Untitled";

    const artist =
      normalize_text(req.body?.artist, 255)
      || normalize_text(metadata?.common?.artist, 255)
      || "Unknown artist";

    const album = normalize_text(metadata?.common?.album, 255) || null;
    const year = to_int_or_null(metadata?.common?.year);
    const genre =
      Array.isArray(metadata?.common?.genre) && metadata.common.genre.length > 0
        ? normalize_text(metadata.common.genre[0], 120) || null
        : null;
    const duration_ms =
      typeof metadata?.format?.duration === "number" && Number.isFinite(metadata.format.duration)
        ? Math.max(0, Math.round(metadata.format.duration * 1000))
        : null;

    const track_number = to_int_or_null(req.body?.track_number ?? metadata?.common?.track?.no);
    const is_explicit = normalize_boolean(req.body?.is_explicit ?? metadata?.common?.explicit);

    const album_id = await ensure_album_id({
      album_id: req.body?.album_id,
      album_title: req.body?.album_title,
      album_artist: req.body?.album_artist,
      album_year: req.body?.album_year,
    });
    const artist_id = await ensure_artist_id(artist);

    const insert_result = await pg_query(
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
        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id::text AS id,
          album_id::text AS album_id,
          title,
          duration_ms,
          track_number,
          is_explicit,
          play_count,
          path
      `,
      [
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
        track_relative_path,
        cover_relative_path,
      ],
    );

    return res.status(201).json(insert_result.rows[0]);
  } catch (error) {
    await remove_file_silent(audio_upload.path);
    if (cover_upload) {
      await remove_file_silent(cover_upload.path);
    }

    if (error?.message === "COVER_TOO_LARGE") {
      return res.status(400).json({ message: "Cover file too large (max 15 MB)." });
    }
    if (error?.message === "R2_UPLOAD_CONFIG_MISSING") {
      return res.status(500).json({
        message: "R2 upload config is incomplete",
      });
    }

    console.error("Admin upload track error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
