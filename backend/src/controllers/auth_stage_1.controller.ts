import type { Request, Response } from "express";
import {
  auth_stage_1_error,
  get_user_me,
  login_user,
  register_user,
} from "../service/auth_stage_1.service.js";
import type { login_request_body, register_request_body } from "../types/auth.types.js";

function is_valid_email(email: string): boolean {
  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email_regex.test(email);
}

function is_valid_username(username: string): boolean {
  const username_regex = /^[a-zA-Z0-9_]{3,32}$/;
  return username_regex.test(username);
}

function parse_register_payload(body: unknown): register_request_body | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const payload = body as Partial<register_request_body>;
  if (
    typeof payload.email !== "string"
    || typeof payload.username !== "string"
    || typeof payload.password !== "string"
  ) {
    return null;
  }

  const email = payload.email.trim();
  const username = payload.username.trim();
  const password = payload.password;

  if (!is_valid_email(email)) {
    return null;
  }
  if (!is_valid_username(username)) {
    return null;
  }
  if (password.length < 8) {
    return null;
  }

  return { email, username, password };
}

function parse_login_payload(body: unknown): login_request_body | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const payload = body as Partial<login_request_body>;
  if (typeof payload.email !== "string" || typeof payload.password !== "string") {
    return null;
  }

  const email = payload.email.trim();
  const password = payload.password;

  if (!is_valid_email(email) || password.length === 0) {
    return null;
  }

  return { email, password };
}

function get_request_metadata(req: Request) {
  const user_agent = req.get("user-agent") ?? null;
  const ip_address = req.ip || null;
  return { user_agent, ip_address };
}

function handle_auth_error(error: unknown, res: Response): void {
  if (!(error instanceof auth_stage_1_error)) {
    console.error("Auth stage 1 error:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }

  if (error.code === "email_taken" || error.code === "username_taken") {
    res.status(409).json({ message: error.message });
    return;
  }

  if (error.code === "invalid_credentials") {
    res.status(401).json({ message: error.message });
    return;
  }

  if (error.code === "user_not_found") {
    res.status(404).json({ message: error.message });
    return;
  }

  console.error("Auth stage 1 error:", error);
  res.status(500).json({ message: "Internal server error" });
}

export async function register(req: Request, res: Response): Promise<void> {
  const payload = parse_register_payload(req.body);
  if (!payload) {
    res.status(400).json({
      message:
        "Invalid payload. Expected { email, username, password } where password has at least 8 chars.",
    });
    return;
  }

  try {
    const response_payload = await register_user(payload, get_request_metadata(req));
    res.status(201).json(response_payload);
  } catch (error) {
    handle_auth_error(error, res);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const payload = parse_login_payload(req.body);
  if (!payload) {
    res.status(400).json({
      message: "Invalid payload. Expected { email, password }.",
    });
    return;
  }

  try {
    const response_payload = await login_user(payload, get_request_metadata(req));
    res.status(200).json(response_payload);
  } catch (error) {
    handle_auth_error(error, res);
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth_user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await get_user_me(req.auth_user.user_id);
    res.status(200).json(user);
  } catch (error) {
    handle_auth_error(error, res);
  }
}
