import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { listTracksAdmin, updateTrackPath } from "../service/admin.tracks.service.js";
import { insertTrack } from "../service/tracks.service.js";
import { listUsersAdmin, listAdminsAdmin } from "../service/admin.db.service.js";
import { createAlbum, findAlbumByTitle, listAlbums } from "../service/albums.service.js";
import { config } from "../config/env.js";

const TRACKS_BASE_DIR = config.TRACKS_BASE_DIR;
const UPLOADS_DIR = path.join(TRACKS_BASE_DIR, "uploads");

function resolveAdminPath(inputPath) {
  if (!inputPath) {
    return null;
  }
  const normalized = path.normalize(inputPath);
  const base = path.resolve(TRACKS_BASE_DIR);
  const baseWithSep = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  const fullPath = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(base, normalized);

  if (fullPath !== base && !fullPath.startsWith(baseWithSep)) {
    return null;
  }
  return fullPath;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with ${code}`));
      }
    });
  });
}

function parseFfprobeJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function ffprobeFile(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      filePath,
    ];
    const proc = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with ${code}: ${stderr || "unknown"}`));
        return;
      }
      resolve(parseFfprobeJson(stdout));
    });
  });
}

function getTagsFromFfprobe(output) {
  const tags = output?.format?.tags ?? {};
  const normalized = {};
  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === "string") {
      normalized[key.toLowerCase()] = value;
    }
  }
  return normalized;
}

function getDurationFromFfprobe(output) {
  const durationStr = output?.format?.duration;
  if (!durationStr) {
    return null;
  }
  const duration = Number.parseFloat(durationStr);
  return Number.isFinite(duration) ? duration : null;
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === "on") {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === "off") {
    return false;
  }
  return null;
}

function getCoverPath(folderPath) {
  const candidates = ["cover.webp", "cover.jpg", "cover.jpeg", "cover.png"];
  for (const filename of candidates) {
    const full = path.join(folderPath, filename);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

export async function adminMe(req, res) {
  res.json({
    userId: req.admin.userId,
    role: req.admin.role,
    note: req.admin.note,
  });
}

export async function adminListTracks(req, res) {
  try {
    const tracks = await listTracksAdmin();
    res.json(tracks);
  } catch (err) {
    console.error("Admin list tracks error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminListUsers(req, res) {
  try {
    const users = await listUsersAdmin();
    res.json(users);
  } catch (err) {
    console.error("Admin list users error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminListAdmins(req, res) {
  try {
    const admins = await listAdminsAdmin();
    res.json(admins);
  } catch (err) {
    console.error("Admin list admins error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminListAlbums(req, res) {
  try {
    const albums = await listAlbums();
    res.json(albums);
  } catch (err) {
    console.error("Admin list albums error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminConvertTrack(req, res) {
  try {
    const { id, sourcePath } = req.body;
    if (!id || !sourcePath) {
      return res.status(400).json({ message: "id and sourcePath required" });
    }

    const inputPath = resolveAdminPath(sourcePath);
    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ message: "Source file not found" });
    }

    if (path.extname(inputPath).toLowerCase() === ".opus") {
      const relative = path.relative(TRACKS_BASE_DIR, inputPath);
      await updateTrackPath(id, relative);
      return res.json({ message: "Already converted", path: relative });
    }

    const outputPath = inputPath.replace(/\.[^.]+$/, ".opus");
    await runFfmpeg(["-y", "-i", inputPath, "-c:a", "libopus", "-b:a", "192k", outputPath]);

    const relative = path.relative(TRACKS_BASE_DIR, outputPath);
    await updateTrackPath(id, relative);

    res.json({ message: "Converted", path: relative });
  } catch (err) {
    console.error("Admin convert track error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminConvertCover(req, res) {
  try {
    const { sourcePath } = req.body;
    if (!sourcePath) {
      return res.status(400).json({ message: "sourcePath required" });
    }

    const inputPath = resolveAdminPath(sourcePath);
    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ message: "Source file not found" });
    }

    if (path.extname(inputPath).toLowerCase() === ".webp") {
      return res.json({ message: "Already webp", path: path.relative(TRACKS_BASE_DIR, inputPath) });
    }

    const folder = path.dirname(inputPath);
    const outputPath = path.join(folder, "cover.webp");

    await runFfmpeg(["-y", "-i", inputPath, "-vf", "scale=1024:-1", "-q:v", "80", outputPath]);

    res.json({ message: "Cover converted", path: path.relative(TRACKS_BASE_DIR, outputPath) });
  } catch (err) {
    console.error("Admin convert cover error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminAutoConvert(req, res) {
  try {
    const tracks = await listTracksAdmin();
    const results = [];

    for (const track of tracks) {
      if (!track.path) {
        continue;
      }
      const inputPath = resolveAdminPath(track.path);
      if (!inputPath || !fs.existsSync(inputPath)) {
        continue;
      }
      const outputPath = inputPath.replace(/\.[^.]+$/, ".opus");
      if (!fs.existsSync(outputPath)) {
        await runFfmpeg(["-y", "-i", inputPath, "-c:a", "libopus", "-b:a", "192k", outputPath]);
      }
      const relative = path.relative(TRACKS_BASE_DIR, outputPath);
      await updateTrackPath(track.id, relative);

      const folder = path.dirname(inputPath);
      const coverPath = getCoverPath(folder);
      if (coverPath && path.extname(coverPath).toLowerCase() !== ".webp") {
        const outputCover = path.join(folder, "cover.webp");
        await runFfmpeg(["-y", "-i", coverPath, "-vf", "scale=1024:-1", "-q:v", "80", outputCover]);
      }

      results.push({ id: track.id, path: relative });
    }

    res.json({ converted: results.length, results });
  } catch (err) {
    console.error("Admin auto convert error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminUploadTrack(req, res) {
  const uploadId = randomUUID();
  const uploadDir = path.join(UPLOADS_DIR, uploadId);

  try {
    const audioFile = req.files?.audio?.[0];
    if (!audioFile) {
      return res.status(400).json({ message: "Audio file required" });
    }

    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const audioExt = path.extname(audioFile.originalname).toLowerCase() || ".bin";
    const sourcePath = path.join(uploadDir, `source${audioExt}`);
    await fs.promises.rename(audioFile.path, sourcePath);

    const opusPath = path.join(uploadDir, "music.opus");
    if (audioExt === ".opus") {
      await fs.promises.copyFile(sourcePath, opusPath);
    } else {
      await runFfmpeg(["-y", "-i", sourcePath, "-c:a", "libopus", "-b:a", "192k", opusPath]);
    }

    const coverFile = req.files?.cover?.[0];
    if (coverFile) {
      const coverExt = path.extname(coverFile.originalname).toLowerCase() || ".jpg";
      const coverSource = path.join(uploadDir, `cover${coverExt}`);
      await fs.promises.rename(coverFile.path, coverSource);
      const coverOut = path.join(uploadDir, "cover.webp");
      if (coverExt === ".webp") {
        await fs.promises.copyFile(coverSource, coverOut);
      } else {
        await runFfmpeg(["-y", "-i", coverSource, "-vf", "scale=1024:-1", "-q:v", "80", coverOut]);
      }
    }

    const probe = await ffprobeFile(opusPath).catch(() => null);
    const tags = probe ? getTagsFromFfprobe(probe) : {};
    const durationSeconds = probe ? getDurationFromFfprobe(probe) : null;
    const durationMs = durationSeconds ? Math.round(durationSeconds * 1000) : null;

    const titleFromBody = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const finalTitle =
      titleFromBody ||
      tags.title ||
      path.parse(audioFile.originalname).name ||
      "Untitled";

    const trackNumber = req.body?.track_number
      ? Number.parseInt(req.body.track_number, 10)
      : null;

    let albumId = req.body?.album_id || null;
    if (!albumId) {
      const albumTitle =
        (req.body?.album_title || req.body?.album_name || "").trim();
      if (albumTitle) {
        const albumArtist =
          (req.body?.album_artist || req.body?.artist || "").trim();
        const albumYear = req.body?.album_year
          ? Number.parseInt(req.body.album_year, 10)
          : null;
        const existingAlbum = await findAlbumByTitle(albumTitle, albumArtist);
        if (existingAlbum?.id) {
          albumId = existingAlbum.id;
        } else {
          const createdAlbum = await createAlbum({
            title: albumTitle,
            artist: albumArtist || null,
            year: Number.isFinite(albumYear) ? albumYear : null,
          });
          albumId = createdAlbum.id;
        }
      }
    }

    const payload = {
      id: uploadId,
      title: finalTitle,
      duration_ms: durationMs,
      path: path.relative(TRACKS_BASE_DIR, opusPath),
      album_id: albumId,
      track_number: Number.isFinite(trackNumber) ? trackNumber : null,
      is_explicit: parseBoolean(req.body?.is_explicit),
      play_count: 0,
    };

    await insertTrack(payload);

    res.status(201).json({
      id: payload.id,
      title: payload.title,
      duration_ms: payload.duration_ms,
      path: payload.path,
      album_id: payload.album_id,
      track_number: payload.track_number,
      is_explicit: payload.is_explicit,
      play_count: payload.play_count,
    });
  } catch (err) {
    console.error("Admin upload track error:", err);
    try {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function adminCreateAlbum(req, res) {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      return res.status(400).json({ message: "Album title required" });
    }
    const artist = typeof req.body?.artist === "string" ? req.body.artist.trim() : "";
    const year = req.body?.year ? Number.parseInt(req.body.year, 10) : null;

    const existing = await findAlbumByTitle(title, artist);
    if (existing?.id) {
      return res.status(409).json({ message: "Album already exists", id: existing.id });
    }

    const album = await createAlbum({
      title,
      artist: artist || null,
      year: Number.isFinite(year) ? year : null,
    });
    res.status(201).json(album);
  } catch (err) {
    console.error("Admin create album error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
