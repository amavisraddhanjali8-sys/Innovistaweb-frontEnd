import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlPort = parseInt(process.env.SQL_PORT || "5432", 10) || 5432;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
const rawSsl = (process.env.SQL_SSL || "").trim().toLowerCase();
const sslConfig: boolean | "require" | "allow" | "prefer" | "verify-full" | { rejectUnauthorized: boolean } =
  rawSsl === "verify-full"
    ? "verify-full"
    : rawSsl === "true" || rawSsl === "require" || rawSsl === "1"
    ? { rejectUnauthorized: false }
    : false;

if (!sqlHost) {
  throw new Error("SQL_HOST must be set in environment variables.");
}
if (!sqlDbName) {
  throw new Error("SQL_DB_NAME must be set in environment variables.");
}
if (!user) {
  throw new Error("SQL_ADMIN_USER or SQL_USER must be set in environment variables.");
}
if (!password) {
  throw new Error("SQL_ADMIN_PASSWORD or SQL_PASSWORD must be set in environment variables.");
}

export default defineConfig({
  schema: "./backend/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    port: sqlPort,
    user,
    password,
    database: sqlDbName,
    ssl: sslConfig,
  },
  verbose: true,
});
