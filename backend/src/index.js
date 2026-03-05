// backend/src/index.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

import { config } from "./config/env.js";           // ← теперь импортируем объект config
import { initAdminOtp } from "./utils/admin-otp.util.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.routes.js";   // если уже есть
import usersRoutes from "./routes/users.routes.js";
import tracksRoutes from "./routes/tracks.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import playlistsRoutes from "./routes/playlists.routes.js";
import standart from "./routes/standart.js"

const app = express();

const corsOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

initAdminOtp();

// роуты
app.use("/api/health", healthRoutes);
app.use("/auth", authRoutes);                      // ← подключаем авторизацию
app.use("/users", usersRoutes);
app.use("/tracks", tracksRoutes);
app.use("/favorites", favoritesRoutes);
app.use("/playlists", playlistsRoutes);
app.use("/admin", adminRoutes);
app.use("/", standart)


// 404 на всякий случай
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// обработка ошибок, в том числе multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large (audio max 50 MB, cover max 15 MB).",
      });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err?.message?.includes("Unsupported")) {
    return res.status(400).json({ message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server error" });
});

app.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});
