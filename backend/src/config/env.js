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

function parseInteger(value, defaultValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
}

function parseMediaDriver(value) {
  const normalized = String(value ?? "local")
    .trim()
    .toLowerCase();
  if (normalized === "r2") {
    return "r2";
  }
  return "local";
}

function resolve_database_url() {
  const direct_candidates = [
    process.env.DATABASE_URL,
    process.env.PG_DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ];

  for (const candidate of direct_candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized.includes("${{") || normalized.includes("}}")) {
      continue;
    }
    if (normalized) {
      return normalized;
    }
  }

  const host = String(
    process.env.PGHOST ||
      process.env.RAILWAY_PRIVATE_DOMAIN ||
      process.env.RAILWAY_TCP_PROXY_DOMAIN ||
      "",
  ).trim();
  const database_name = String(
    process.env.PGDATABASE || process.env.POSTGRES_DB || "",
  ).trim();
  const user = String(
    process.env.PGUSER || process.env.POSTGRES_USER || "",
  ).trim();
  const password = String(
    process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "",
  ).trim();
  const port = String(
    process.env.PGPORT || process.env.RAILWAY_TCP_PROXY_PORT || "5432",
  ).trim();
  if (!host || !database_name || !user) {
    return "";
  }

  const encoded_user = encodeURIComponent(user);
  const encoded_password = encodeURIComponent(password);
  const auth_part = password ? `${encoded_user}:${encoded_password}` : encoded_user;

  return `postgresql://${auth_part}@${host}:${port}/${database_name}`;
}

function resolve_pg_ssl_default() {
  const ssl_mode = String(
    process.env.PGSSLMODE || process.env.PG_SSLMODE || "",
  )
    .trim()
    .toLowerCase();
  return (
    ssl_mode === "require" ||
    ssl_mode === "verify-ca" ||
    ssl_mode === "verify-full"
  );
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
  PLAYLIST_REALTIME_ENABLED: parseBoolean(
    process.env.PLAYLIST_REALTIME_ENABLED,
    false,
  ),
  MEDIA_DRIVER: parseMediaDriver(process.env.MEDIA_DRIVER),
  FAVORITES_PLAYLIST_NAME: process.env.FAVORITES_PLAYLIST_NAME || "favorite",
  SESSION_MAX_AGE_DAYS: parseInt(process.env.SESSION_MAX_AGE_DAYS || "7", 10),
  TRACKS_BASE_DIR: process.env.TRACKS_BASE_DIR || defaultTracksBaseDir,
  UPLOAD_TMP_DIR: process.env.UPLOAD_TMP_DIR || defaultUploadTmpDir,
  PG_DATABASE_URL: resolve_database_url(),
  PG_SSL: parseBoolean(process.env.PG_SSL, resolve_pg_ssl_default()),
  PG_CONNECT_TIMEOUT_MS: parseInteger(process.env.PG_CONNECT_TIMEOUT_MS, 3000),
  PG_QUERY_TIMEOUT_MS: parseInteger(process.env.PG_QUERY_TIMEOUT_MS, 5000),
  PG_IDLE_TIMEOUT_MS: parseInteger(process.env.PG_IDLE_TIMEOUT_MS, 10000),
  PG_MAX_CLIENTS: parseInteger(process.env.PG_MAX_CLIENTS, 10),
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "",
  R2_ADS_OBJECT_KEY: process.env.R2_ADS_OBJECT_KEY || "ad/ads.opus",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_EMBEDDING_MODEL:
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  RECOMMENDATIONS_LIMIT: parseInt(process.env.RECOMMENDATIONS_LIMIT || "20", 10),
};
