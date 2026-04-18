import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { auth_stage_1_env } from "./config/env_stage_1.js";
import { verify_token } from "./middleware/verify_token.middleware.js";
import auth_stage_1_router from "./routes/auth_stage_1.routes.js";

const app = express();

app.use(
  cors({
    origin: auth_stage_1_env.cors_origins,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", auth_stage_1_router);

app.get("/api/protected/ping", verify_token, (req: Request, res: Response) => {
  res.status(200).json({
    message: "Protected route is available",
    user_id: req.auth_user?.user_id ?? null,
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled stage 1 server error:", error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(auth_stage_1_env.port, () => {
  console.log(`Stage 1 auth server is running on http://localhost:${auth_stage_1_env.port}`);
});
