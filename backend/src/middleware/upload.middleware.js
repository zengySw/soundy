import fs from "fs";
import path from "path";
import multer from "multer";
import { config } from "../config/env.js";

const uploadRoot = config.UPLOAD_TMP_DIR;
fs.mkdirSync(uploadRoot, { recursive: true });

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function getExtension(file) {
  return path.extname(file.originalname || "").toLowerCase();
}

function fileFilter(req, file, cb) {
  const ext = getExtension(file);
  if (file.fieldname === "audio") {
    if (AUDIO_EXTENSIONS.has(ext) || file.mimetype.startsWith("audio/")) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported audio format"));
  }
  if (file.fieldname === "cover") {
    if (IMAGE_EXTENSIONS.has(ext) || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported cover format"));
  }
  return cb(new Error("Unexpected file field"));
}

export const upload = multer({
  dest: uploadRoot,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter,
});
