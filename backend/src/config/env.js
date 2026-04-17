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
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "1433", 10),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || "soundy",
  DB_ENCRYPT: parseBoolean(process.env.DB_ENCRYPT, false),
  DB_TRUST_SERVER_CERTIFICATE: parseBoolean(
    process.env.DB_TRUST_SERVER_CERTIFICATE,
    true,
  ),
  DB_AUTO_CREATE_DATABASE: parseBoolean(
    process.env.DB_AUTO_CREATE_DATABASE,
    true,
  ),
  DB_SYNC_SCHEMA: parseBoolean(process.env.DB_SYNC_SCHEMA, true),
  FAVORITES_PLAYLIST_NAME: process.env.FAVORITES_PLAYLIST_NAME || "favorite",
  SESSION_MAX_AGE_DAYS: parseInt(process.env.SESSION_MAX_AGE_DAYS || "7", 10),
  TRACKS_BASE_DIR: process.env.TRACKS_BASE_DIR || defaultTracksBaseDir,
  UPLOAD_TMP_DIR: process.env.UPLOAD_TMP_DIR || defaultUploadTmpDir,
};
