// backend/src/config/env.js
import "dotenv/config";

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "1433", 10),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || "soundy",
  DB_ENCRYPT: process.env.DB_ENCRYPT === "true",
  DB_TRUST_SERVER_CERTIFICATE:
    process.env.DB_TRUST_SERVER_CERTIFICATE === undefined
      ? true
      : process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  FAVORITES_PLAYLIST_NAME: process.env.FAVORITES_PLAYLIST_NAME || "favorite",
  SESSION_MAX_AGE_DAYS: parseInt(process.env.SESSION_MAX_AGE_DAYS || "7", 10),
  TRACKS_BASE_DIR: process.env.TRACKS_BASE_DIR || "/home/zengy/soundy/database/music",
  
};
