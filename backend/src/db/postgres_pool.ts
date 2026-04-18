import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";
import { auth_stage_1_env } from "../config/env_stage_1.js";

let pg_pool: Pool | null = null;

function build_pool_config(): PoolConfig {
  return {
    connectionString: auth_stage_1_env.pg_database_url,
    ssl: auth_stage_1_env.pg_ssl ? { rejectUnauthorized: false } : false,
  };
}

export function get_pg_pool(): Pool {
  if (pg_pool) {
    return pg_pool;
  }

  pg_pool = new Pool(build_pool_config());
  pg_pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error);
  });

  return pg_pool;
}

export async function pg_query<T extends QueryResultRow = QueryResultRow>(
  query_text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return get_pg_pool().query<T>(query_text, values);
}
