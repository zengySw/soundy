CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  username varchar(64) NOT NULL,
  password_hash text NOT NULL,
  avatar_url text,
  is_premium boolean NOT NULL DEFAULT FALSE,
  country_code varchar(2),
  is_active boolean NOT NULL DEFAULT TRUE,
  theme_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'primary', '#6366f1',
    'accent', '#8b5cf6',
    'bg', '#0a0a0f',
    'preset', 'dark'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (length(trim(email)) > 0),
  CONSTRAINT users_username_not_blank CHECK (length(trim(username)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
  ON users (lower(username));

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_info text NOT NULL DEFAULT 'unknown',
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_sessions_expires_after_created CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_refresh_token_unique_idx
  ON user_sessions (refresh_token);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
  ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
  ON user_sessions (expires_at);

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON user_sessions (user_id, expires_at)
  WHERE revoked = FALSE;

CREATE OR REPLACE FUNCTION set_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_updated_at();