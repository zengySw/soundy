// backend/src/db.js
import sql from "mssql";
import { config } from "./config/env.js";
import { ensureDatabaseSchema } from "./db/schema.js";

function buildDbConfig(databaseName) {
  return {
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    server: config.DB_HOST,
    port: config.DB_PORT,
    database: databaseName,
    options: {
      encrypt: config.DB_ENCRYPT,
      trustServerCertificate: config.DB_TRUST_SERVER_CERTIFICATE,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

function isSafeDbName(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

async function ensureDatabaseExists() {
  if (!config.DB_AUTO_CREATE_DATABASE) {
    return;
  }
  if (!isSafeDbName(config.DB_NAME)) {
    throw new Error(
      "DB_NAME contains unsupported characters. Use letters, numbers and underscore only.",
    );
  }

  const masterPool = await new sql.ConnectionPool(buildDbConfig("master")).connect();
  try {
    await masterPool
      .request()
      .input("dbName", sql.NVarChar(128), config.DB_NAME)
      .query(`
        IF DB_ID(@dbName) IS NULL
        BEGIN
          DECLARE @createSql NVARCHAR(300) = N'CREATE DATABASE ' + QUOTENAME(@dbName);
          EXEC(@createSql);
        END
      `);
  } finally {
    await masterPool.close();
  }
}

const poolPromise = (async () => {
  await ensureDatabaseExists();
  const pool = await new sql.ConnectionPool(buildDbConfig(config.DB_NAME)).connect();
  if (config.DB_SYNC_SCHEMA) {
    await ensureDatabaseSchema(pool);
    console.log("MSSQL schema synchronized");
  }
  console.log("MSSQL connected");
  return pool;
})().catch((err) => {
  console.error("MSSQL connection/setup error:", err);
  process.exit(1);
});

export { poolPromise, sql };
