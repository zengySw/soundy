import { poolPromise, sql } from "../db.js";

export async function getAdminByUserId(userId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, userId)
    .query(`
      SELECT user_id, role, granted_at, granted_by, note
      FROM admins
      WHERE user_id = @user_id
    `);

  return result.recordset[0] ?? null;
}
