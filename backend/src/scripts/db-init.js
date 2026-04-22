import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { get_pg_pool } from "../db_pg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const project_root = path.resolve(__dirname, "../../..");

const migration_files = [
  "database/auth_stage_1.postgres.sql",
  "database/users_theme_config.postgres.sql",
  "database/catalog_core.postgres.sql",
  "database/listening_events.postgres.sql",
  "database/playlist_collaboration.postgres.sql",
  "database/search_tsvector.postgres.sql",
  "database/pgvector_tracks_embedding.sql",
  "database/albums.sql",
  "database/favorites.sql",
];

async function run_migration_file(pool, relative_file_path) {
  const absolute_file_path = path.join(project_root, relative_file_path);
  try {
    await fs.access(absolute_file_path);
  } catch {
    return;
  }

  const sql_text = await fs.readFile(absolute_file_path, "utf8");
  const normalized_sql_text = sql_text.trim();
  if (!normalized_sql_text) {
    return;
  }

  await pool.query(normalized_sql_text);
  console.log(`Applied migration: ${relative_file_path}`);
}

async function main() {
  const pool = get_pg_pool();

  try {
    for (const file_path of migration_files) {
      await run_migration_file(pool, file_path);
    }
    console.log("PostgreSQL schema initialized");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("PostgreSQL initialization failed:", err);
  process.exit(1);
});
