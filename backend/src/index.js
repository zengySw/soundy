import express from "express";
import cors from "cors";

import { PORT } from "./config/env.js";
import healthRoutes from "./routes/health.js";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use("/api", healthRoutes);

// start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
