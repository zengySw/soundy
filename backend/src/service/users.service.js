import { poolPromise, sql } from "../db.js";

export async function getUserById(id) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query(`
      SELECT id, username, email, avatar_url, is_premium, country_code
      FROM users
      WHERE id = @id AND is_active = 1
    `);

  return result.recordset[0] ?? null;
}
