import { poolPromise, sql } from "../db.js";

const columnCache = new Map();

async function getTableColumns(tableName) {
  if (columnCache.has(tableName)) {
    return columnCache.get(tableName);
  }
  const pool = await poolPromise;
  const result = await pool.request().input("table", sql.NVarChar(255), tableName).query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = @table
  `);
  const columns = new Set(
    result.recordset.map((row) => row.COLUMN_NAME.toLowerCase()),
  );
  columnCache.set(tableName, columns);
  return columns;
}

function pickColumns(available, candidates) {
  return candidates.filter((name) => available.has(name.toLowerCase()));
}

export async function listUsersAdmin() {
  const columns = await getTableColumns("users");
  if (columns.size === 0) {
    return [];
  }
  const safeColumns = pickColumns(columns, [
    "id",
    "username",
    "email",
    "is_premium",
    "country_code",
    "is_active",
    "created_at",
  ]);
  if (safeColumns.length === 0) {
    return [];
  }
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT TOP (200) ${safeColumns.join(", ")}
    FROM users
    ORDER BY ${safeColumns.includes("created_at") ? "created_at DESC" : safeColumns[0]}
  `);
  return result.recordset;
}

export async function listAdminsAdmin() {
  const columns = await getTableColumns("admins");
  if (columns.size === 0) {
    return [];
  }
  const safeColumns = pickColumns(columns, [
    "user_id",
    "role",
    "granted_at",
    "granted_by",
    "note",
  ]);
  if (safeColumns.length === 0) {
    return [];
  }
  const pool = await poolPromise;
  const orderColumn = safeColumns.includes("granted_at")
    ? "granted_at DESC"
    : safeColumns[0];
  const result = await pool.request().query(`
    SELECT TOP (200) ${safeColumns.join(", ")}
    FROM admins
    ORDER BY ${orderColumn}
  `);
  return result.recordset;
}
