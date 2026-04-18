import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { PoolClient } from "pg";
import { auth_stage_1_env } from "../config/env_stage_1.js";
import { get_pg_pool, pg_query } from "../db/postgres_pool.js";
import type {
  auth_response_payload,
  auth_session_metadata,
  auth_user,
  login_request_body,
  register_request_body,
} from "../types/auth.types.js";

type auth_error_code =
  | "email_taken"
  | "username_taken"
  | "invalid_credentials"
  | "invalid_token"
  | "invalid_session"
  | "user_not_found";

interface user_private_row {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

interface user_public_row {
  id: string;
  email: string;
  username: string;
  created_at: Date;
}

interface user_session_row {
  id: string;
}

export class auth_stage_1_error extends Error {
  public readonly code: auth_error_code;

  constructor(code: auth_error_code, message: string) {
    super(message);
    this.code = code;
  }
}

function normalize_email(email: string): string {
  return email.trim().toLowerCase();
}

function normalize_username(username: string): string {
  return username.trim();
}

function build_expiration_date(): Date {
  const expiration_ms = auth_stage_1_env.jwt_expires_in_minutes * 60 * 1000;
  return new Date(Date.now() + expiration_ms);
}

function map_user_to_response(user: user_public_row) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: user.created_at.toISOString(),
  };
}

function sign_access_token(user_id: string, session_id: string): string {
  return jwt.sign(
    { user_id, session_id },
    auth_stage_1_env.jwt_secret,
    {
      algorithm: "HS256",
      expiresIn: `${auth_stage_1_env.jwt_expires_in_minutes}m`,
    },
  );
}

async function create_session(
  client: PoolClient,
  user_id: string,
  metadata: auth_session_metadata,
): Promise<user_session_row> {
  const expires_at = build_expiration_date();
  const refresh_token = randomUUID();
  const session_result = await client.query<user_session_row>(
    `
      INSERT INTO user_sessions (
        user_id,
        device_info,
        refresh_token,
        expires_at,
        last_used_at,
        revoked
      )
      VALUES ($1, $2, $3, $4, now(), FALSE)
      RETURNING id
    `,
    [user_id, metadata.user_agent ?? "unknown", refresh_token, expires_at],
  );

  const session = session_result.rows[0];
  if (!session) {
    throw new Error("Failed to create user session");
  }

  return session;
}

function build_auth_response(user: user_public_row, session: user_session_row): auth_response_payload {
  const access_token = sign_access_token(user.id, session.id);
  return {
    access_token,
    token_type: "Bearer",
    expires_in_seconds: auth_stage_1_env.jwt_expires_in_minutes * 60,
    user: map_user_to_response(user),
  };
}

export async function register_user(
  payload: register_request_body,
  metadata: auth_session_metadata,
): Promise<auth_response_payload> {
  const pool = get_pg_pool();
  const client = await pool.connect();

  const email = normalize_email(payload.email);
  const username = normalize_username(payload.username);
  const password_hash = await bcrypt.hash(payload.password, auth_stage_1_env.bcrypt_salt_rounds);

  try {
    await client.query("BEGIN");

    const email_exists_result = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    if (email_exists_result.rows.length > 0) {
      throw new auth_stage_1_error("email_taken", "Email is already in use");
    }

    const username_exists_result = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1",
      [username],
    );
    if (username_exists_result.rows.length > 0) {
      throw new auth_stage_1_error("username_taken", "Username is already in use");
    }

    const user_result = await client.query<user_public_row>(
      `
        INSERT INTO users (email, username, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email, username, created_at
      `,
      [email, username, password_hash],
    );
    const user = user_result.rows[0];
    if (!user) {
      throw new Error("Failed to create user");
    }

    const session = await create_session(client, user.id, metadata);

    await client.query("COMMIT");
    return build_auth_response(user, session);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // no-op: transaction can fail before BEGIN finishes
    }

    if (error instanceof auth_stage_1_error) {
      throw error;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function login_user(
  payload: login_request_body,
  metadata: auth_session_metadata,
): Promise<auth_response_payload> {
  const pool = get_pg_pool();
  const client = await pool.connect();

  try {
    const email = normalize_email(payload.email);
    const user_result = await client.query<user_private_row>(
      `
        SELECT id, email, username, password_hash, created_at
        FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [email],
    );
    const user = user_result.rows[0];

    if (!user) {
      throw new auth_stage_1_error("invalid_credentials", "Invalid email or password");
    }

    const password_is_valid = await bcrypt.compare(payload.password, user.password_hash);
    if (!password_is_valid) {
      throw new auth_stage_1_error("invalid_credentials", "Invalid email or password");
    }

    await client.query("BEGIN");
    const session = await create_session(client, user.id, metadata);
    await client.query("COMMIT");

    const public_user: user_public_row = {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
    };

    return build_auth_response(public_user, session);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // no-op: transaction can be absent for early auth failures
    }

    if (error instanceof auth_stage_1_error) {
      throw error;
    }

    throw error;
  } finally {
    client.release();
  }
}

export function verify_access_token(access_token: string): auth_user {
  let decoded_token: string | JwtPayload;
  try {
    decoded_token = jwt.verify(access_token, auth_stage_1_env.jwt_secret, {
      algorithms: ["HS256"],
    });
  } catch {
    throw new auth_stage_1_error("invalid_token", "Token verification failed");
  }

  if (typeof decoded_token === "string") {
    throw new auth_stage_1_error("invalid_token", "Token payload is invalid");
  }

  const user_id = decoded_token.user_id;
  const session_id = decoded_token.session_id;

  if (typeof user_id !== "string" || typeof session_id !== "string") {
    throw new auth_stage_1_error("invalid_token", "Token payload is invalid");
  }

  return { user_id, session_id };
}

export async function ensure_active_session(auth_user: auth_user): Promise<void> {
  const result = await pg_query<{ id: string }>(
    `
      SELECT id
      FROM user_sessions
      WHERE id = $1
        AND user_id = $2
        AND revoked = FALSE
        AND expires_at > now()
      LIMIT 1
    `,
    [auth_user.session_id, auth_user.user_id],
  );

  if (result.rows.length === 0) {
    throw new auth_stage_1_error("invalid_session", "Session is invalid or expired");
  }
}

export async function get_user_me(user_id: string) {
  const result = await pg_query<user_public_row>(
    `
      SELECT id, email, username, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [user_id],
  );

  const user = result.rows[0];
  if (!user) {
    throw new auth_stage_1_error("user_not_found", "User not found");
  }

  return map_user_to_response(user);
}
