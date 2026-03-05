const tableColumnsCache = new Map();

function isSafeIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

export async function getTableColumns(pool, tableName, schema = "dbo") {
  if (!isSafeIdentifier(tableName) || !isSafeIdentifier(schema)) {
    throw new Error("Invalid table identifier");
  }
  const cacheKey = `${schema}.${tableName}`;
  if (tableColumnsCache.has(cacheKey)) {
    return tableColumnsCache.get(cacheKey);
  }
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${tableName}'
  `);
  const columns = new Set(
    result.recordset.map((row) => row.COLUMN_NAME.toLowerCase()),
  );
  tableColumnsCache.set(cacheKey, columns);
  return columns;
}

export function pickColumn(columns, candidates) {
  return candidates.find((name) => columns.has(name.toLowerCase()));
}
