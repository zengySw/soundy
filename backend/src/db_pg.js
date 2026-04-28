import { Pool } from "pg";
import { config } from "./config/env.js";

let pg_pool = null;

function build_pg_config() {
  if (!config.PG_DATABASE_URL) {
    throw new Error("PG_DATABASE_URL_MISSING");
  }

  return {
    connectionString: config.PG_DATABASE_URL,
    ssl: config.PG_SSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: config.PG_CONNECT_TIMEOUT_MS,
    query_timeout: config.PG_QUERY_TIMEOUT_MS,
    idleTimeoutMillis: config.PG_IDLE_TIMEOUT_MS,
    max: config.PG_MAX_CLIENTS,
  };
}

export function get_pg_pool() {
  if (pg_pool) {
    return pg_pool;
  }

  pg_pool = new Pool(build_pg_config());
  pg_pool.on("error", (err) => {
    console.error("PostgreSQL pool error:", err);
  });
  return pg_pool;
}

export async function pg_query(query_text, values = []) {
  const pool = get_pg_pool();
  return pool.query(query_text, values);
}
