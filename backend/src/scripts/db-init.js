import { poolPromise } from "../db.js";

async function main() {
  const pool = await poolPromise;
  await pool.close();
  console.log("Database initialized");
}

main().catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
