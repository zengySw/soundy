// backend/src/db.js
import sql from "mssql";
import { config } from "./config/env.js";

const dbConfig = {
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  server: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  options: {
    encrypt: config.DB_ENCRYPT,                               // true для Azure, часто false локально
    trustServerCertificate: config.DB_TRUST_SERVER_CERTIFICATE,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("MSSQL подключено успешно");
    return pool;
  })
  .catch((err) => {
    console.error("Ошибка подключения к MSSQL:", err);
    process.exit(1); // или throw err — на твой вкус
  });

export { poolPromise, sql };
