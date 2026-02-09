import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getTracksWithPaths, getTrackPathById } from "../service/tracks.service.js";
import { config } from "../config/env.js";

const TRACKS_BASE_DIR = config.TRACKS_BASE_DIR;

const COVER_CANDIDATES = ["cover.webp", "cover.jpg", "cover.jpeg", "cover.png"];

function resolveTrackPath(inputPath) {
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

function resolveAudioFilePath(fullPath) {
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    return fullPath;
  }
  if (!stat.isDirectory()) {
    return null;
  }

  const entries = fs.readdirSync(fullPath);
  if (entries.includes("music.opus")) {
    const candidate = path.join(fullPath, "music.opus");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  const audioExtensions = new Set([
    ".opus",
    ".ogg",
    ".mp3",
    ".flac",
    ".wav",
    ".m4a",
  ]);

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!audioExtensions.has(ext)) {
      continue;
    }
    const candidate = path.join(fullPath, entry);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function streamAudioFile(req, res, audioPath) {
  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(audioPath).toLowerCase();
  const contentType =
    ext === ".opus" || ext === ".ogg" ? "audio/ogg" : "audio/mpeg";

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    fs.createReadStream(audioPath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": fileSize,
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  });

  fs.createReadStream(audioPath).pipe(res);
}

function readCoverFromFolder(trackPath) {
  const dir = path.dirname(trackPath);
  for (const filename of COVER_CANDIDATES) {
    const coverPath = path.join(dir, filename);
    if (fs.existsSync(coverPath)) {
      const data = fs.readFileSync(coverPath);
      const ext = path.extname(filename).toLowerCase();
      const mime =
        ext === ".webp"
          ? "image/webp"
          : ext === ".png"
            ? "image/png"
            : "image/jpeg";
      return `data:${mime};base64,${data.toString("base64")}`;
    }
  }
  return null;
}

function mapMetadata(row, tags, durationSeconds, fallbackCover) {
  const cover = fallbackCover;
  const artist =
    tags.artist ||
    tags.album_artist ||
    row.track_artist_name ||
    row.artist ||
    row.artist_name ||
    row.album_artist ||
    "Unknown";
  const album = tags.album || row.album_title || null;

  return {
    id: row.id,
    title: tags.title || row.title || "Unknown",
    artist,
    album,
    year: tags.date ? Number.parseInt(tags.date, 10) || null : null,
    genre: tags.genre || null,
    durationMs: durationSeconds ? Math.round(durationSeconds * 1000) : null,
    cover,
  };
}

function parseFfprobeJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
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

export async function listTracks(req, res) {
  try {
    const rows = await getTracksWithPaths();

    const tracks = [];
    for (const row of rows) {
      const fullPath = resolveTrackPath(row.path);
      if (!fullPath || !fs.existsSync(fullPath)) {
        continue;
      }
      const audioPath = resolveAudioFilePath(fullPath);
      if (!audioPath) {
        console.error(`No audio file found for ${fullPath}`);
        continue;
      }
      const fallbackCover = readCoverFromFolder(audioPath);
      try {
        const probe = await ffprobeFile(audioPath);
        const tags = getTagsFromFfprobe(probe);
        const durationSeconds = getDurationFromFfprobe(probe);
        tracks.push(mapMetadata(row, tags, durationSeconds, fallbackCover));
      } catch (err) {
        console.error(`ffprobe failed for ${audioPath}:`, err.message);
        tracks.push(mapMetadata(row, {}, null, fallbackCover));
      }
    }

    res.json(tracks);
  } catch (err) {
    console.error("List tracks error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function streamTrack(req, res) {
  try {
    const { id } = req.params;
    const row = await getTrackPathById(id);
    if (!row) {
      return res.status(404).json({ message: "Track not found" });
    }

    const fullPath = resolveTrackPath(row.path);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" });
    }
    const audioPath = resolveAudioFilePath(fullPath);
    if (!audioPath) {
      return res.status(404).json({ message: "Audio file not found" });
    }

    streamAudioFile(req, res, audioPath);
  } catch (err) {
    console.error("Stream track error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function streamAd(req, res) {
  try {
    const adPath = path.join(TRACKS_BASE_DIR, "ad", "ads.opus");
    const resolved = resolveTrackPath(adPath);
    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(404).json({ message: "Ad not found" });
    }
    const audioPath = resolveAudioFilePath(resolved);
    if (!audioPath) {
      return res.status(404).json({ message: "Ad audio not found" });
    }
    streamAudioFile(req, res, audioPath);
  } catch (err) {
    console.error("Stream ad error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
