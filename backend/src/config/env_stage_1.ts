import "dotenv/config";

function parse_boolean(raw_value: string | undefined, default_value: boolean): boolean {
  if (raw_value === undefined) {
    return default_value;
  }
  const normalized_value = raw_value.trim().toLowerCase();
  return normalized_value === "1" || normalized_value === "true" || normalized_value === "yes";
}

function parse_integer(raw_value: string | undefined, fallback_value: number): number {
  if (raw_value === undefined || raw_value.trim() === "") {
    return fallback_value;
  }
  const parsed_value = Number.parseInt(raw_value, 10);
  if (!Number.isFinite(parsed_value) || Number.isNaN(parsed_value)) {
    return fallback_value;
  }
  return parsed_value;
}

function require_env(key: string): string {
  const raw_value = process.env[key];
  if (!raw_value || raw_value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return raw_value;
}

function parse_cors_origins(raw_value: string | undefined): string[] {
  const source = raw_value ?? "http://localhost:3000";
  return source
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const jwt_expires_in_minutes = parse_integer(process.env.JWT_EXPIRES_IN_MINUTES, 60);
const bcrypt_salt_rounds = parse_integer(process.env.BCRYPT_SALT_ROUNDS, 10);

if (jwt_expires_in_minutes <= 0) {
  throw new Error("JWT_EXPIRES_IN_MINUTES must be greater than 0");
}

if (bcrypt_salt_rounds <= 3) {
  throw new Error("BCRYPT_SALT_ROUNDS must be greater than 3");
}

export const auth_stage_1_env = {
  node_env: process.env.NODE_ENV ?? "development",
  port: parse_integer(process.env.PORT, 4000),
  cors_origins: parse_cors_origins(process.env.CORS_ORIGIN),
  pg_database_url: require_env("PG_DATABASE_URL"),
  pg_ssl: parse_boolean(process.env.PG_SSL, false),
  jwt_secret: require_env("JWT_SECRET"),
  jwt_expires_in_minutes,
  bcrypt_salt_rounds,
} as const;
