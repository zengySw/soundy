import type { NextFunction, Request, Response } from "express";
import {
  auth_stage_1_error,
  ensure_active_session,
  verify_access_token,
} from "../service/auth_stage_1.service.js";

function extract_bearer_token(authorization_header: string | undefined): string | null {
  if (!authorization_header) {
    return null;
  }

  const [token_type, token] = authorization_header.split(" ");
  if (token_type !== "Bearer" || !token || token.trim() === "") {
    return null;
  }

  return token.trim();
}

export async function verify_token(req: Request, res: Response, next: NextFunction): Promise<void> {
  const access_token = extract_bearer_token(req.headers.authorization);
  if (!access_token) {
    res.status(401).json({ message: "Missing Bearer token" });
    return;
  }

  try {
    const auth_user = verify_access_token(access_token);
    await ensure_active_session(auth_user);
    req.auth_user = auth_user;
    next();
  } catch (error) {
    if (error instanceof auth_stage_1_error) {
      res.status(401).json({ message: error.message });
      return;
    }

    console.error("verify_token middleware error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
}
