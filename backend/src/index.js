import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import crypto from "crypto";

import { config } from "./config/env.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import searchRoutes from "./routes/search.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import tracksRoutes from "./routes/tracks.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import playlistsRoutes from "./routes/playlists.routes.js";
import artistAnalyticsRoutes from "./routes/artist_analytics.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import standart from "./routes/standart.js";
import { initAdminOtp } from "./utils/admin-otp.util.js";
import { send_api_error, send_api_not_found } from "./utils/api-response.util.js";

const app = express();

const corsOrigins = new Set(
  config.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isLocalDevelopmentOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const isHttpProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const isLoopbackHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (parsed.protocol === "tauri:") {
      return true;
    }

    return isHttpProtocol && isLoopbackHost;
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (corsOrigins.has(origin)) {
        return callback(null, true);
      }
      if (config.NODE_ENV !== "production" && isLocalDevelopmentOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const request_id = crypto.randomUUID();
  const started_at = Date.now();
  res.setHeader("X-Request-Id", request_id);
  res.locals.request_id = request_id;

  res.on("finish", () => {
    const duration_ms = Date.now() - started_at;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration_ms}ms request_id=${request_id}`,
    );
  });

  next();
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/users", usersRoutes);
app.use("/api/tracks", tracksRoutes);
app.use("/tracks", tracksRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/favorites", favoritesRoutes);
app.use("/playlists", playlistsRoutes);
app.use("/api/playlists", playlistsRoutes);
app.use("/api/search", searchRoutes);
app.use("/search", searchRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/recommendations", recommendationsRoutes);
app.use("/api/artist/analytics", artistAnalyticsRoutes);
app.use("/artist/analytics", artistAnalyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/admin", adminRoutes);
app.use("/", standart);

app.use((req, res) => {
  send_api_not_found(res, "Not found");
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return send_api_error(res, {
        status: 400,
        code: "FILE_TOO_LARGE",
        message: "File too large (audio max 50 MB, cover max 15 MB).",
      });
    }
    return send_api_error(res, {
      status: 400,
      code: "UPLOAD_ERROR",
      message: err.message,
    });
  }

  console.error(`Unhandled error request_id=${res.locals.request_id}:`, err);
  send_api_error(res, {
    status: 500,
    code: "UNHANDLED_SERVER_ERROR",
    message: "Server error",
  });
});

initAdminOtp();

app.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});
