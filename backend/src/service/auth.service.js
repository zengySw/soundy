import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { pg_query } from "../db_pg.js";
import { config } from "../config/env.js";

function normalize_email(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalize_username(value) {
  return String(value ?? "").trim();
}

export async function registerUser(data) {
  const {
    username,
    email,
    password,
    country_code = null,
  } = data;

  const normalized_email = normalize_email(email);
  const normalized_username = normalize_username(username);
  const password_hash = await bcrypt.hash(password, 10);

  try {
    await pg_query(
      `
        INSERT INTO users (
          username,
          email,
          password_hash,
          avatar_url,
          is_premium,
          country_code,
          is_active
        )
        VALUES ($1, $2, $3, NULL, FALSE, $4, TRUE)
      `,
      [normalized_username, normalized_email, password_hash, country_code],
    );

    return true;
  } catch (err) {
    if (err?.code === "23505") {
      throw new Error("EMAIL_EXISTS");
    }
    throw err;
  }
}

export async function loginUser(email, password, deviceInfo) {
  const normalized_email = normalize_email(email);

  const result = await pg_query(
    `
      SELECT id, password_hash, is_active
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [normalized_email],
  );

  const user = result.rows[0];
  if (!user || user.is_active === false) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const sessionToken = randomUUID();
  const sessionMaxAgeMs = config.SESSION_MAX_AGE_DAYS * 24 * 3600 * 1000;

  await pg_query(
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
    `,
    [
      user.id,
      deviceInfo || "unknown",
      sessionToken,
      new Date(Date.now() + sessionMaxAgeMs),
    ],
  );

  return { sessionToken, userId: user.id };
}

export async function getSessionByToken(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const result = await pg_query(
    `
      SELECT user_id, expires_at, revoked
      FROM user_sessions
      WHERE refresh_token = $1
      LIMIT 1
    `,
    [sessionToken],
  );

  const session = result.rows[0];
  if (!session) {
    return null;
  }

  if (session.revoked || (session.expires_at && new Date(session.expires_at) <= new Date())) {
    return null;
  }

  await pg_query(
    `
      UPDATE user_sessions
      SET last_used_at = now()
      WHERE refresh_token = $1
    `,
    [sessionToken],
  );

  return { userId: session.user_id };
}

export async function deleteSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  await pg_query(
    `
      UPDATE user_sessions
      SET revoked = TRUE
      WHERE refresh_token = $1
    `,
    [sessionToken],
  );
}