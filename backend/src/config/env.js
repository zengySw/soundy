// backend/src/config/env.js
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendRoot, "..");
const defaultTracksBaseDir = path.join(projectRoot, "database", "music");
const defaultUploadTmpDir = path.join(projectRoot, "database", ".uploads_tmp");

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  FAVORITES_PLAYLIST_NAME: process.env.FAVORITES_PLAYLIST_NAME || "favorite",
  SESSION_MAX_AGE_DAYS: parseInt(process.env.SESSION_MAX_AGE_DAYS || "7", 10),
  TRACKS_BASE_DIR: process.env.TRACKS_BASE_DIR || defaultTracksBaseDir,
  UPLOAD_TMP_DIR: process.env.UPLOAD_TMP_DIR || defaultUploadTmpDir,
  PG_DATABASE_URL: process.env.PG_DATABASE_URL || "",
  PG_SSL: parseBoolean(process.env.PG_SSL, false),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_EMBEDDING_MODEL:
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  RECOMMENDATIONS_LIMIT: parseInt(process.env.RECOMMENDATIONS_LIMIT || "20", 10),
};
