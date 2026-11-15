import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

declare global {
  var _postgresPool: Pool | undefined;
  var _dbOfflineFallback: boolean | undefined;
  var _dbOfflineUntil: number | undefined;
}

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "57P01",
  "57P02",
  "57P03",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
]);

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as { code?: unknown; message?: unknown };
  if (typeof record.code === "string" && CONNECTION_ERROR_CODES.has(record.code)) {
    return true;
  }
  const msg = typeof record.message === "string" ? record.message.toLowerCase() : "";
  return (
    msg.includes("timeout") ||
    msg.includes("econn") ||
    msg.includes("connection terminated") ||
    msg.includes("connect") ||
    msg.includes("socket")
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER
  );
}

export function isMemoryFallbackActive(): boolean {
  if (!isDatabaseConfigured()) return true;
  if (global._dbOfflineFallback && global._dbOfflineUntil && Date.now() > global._dbOfflineUntil) {
    global._dbOfflineFallback = false;
    global._dbOfflineUntil = undefined;
  }
  return Boolean(global._dbOfflineFallback);
}

export function markDatabaseOffline(err?: unknown): void {
  if (!isConnectionError(err) && isDatabaseConfigured() && global._postgresPool) {
    // Non-connection errors (e.g., query/constraint errors) should not disable Cloud SQL globally.
    console.warn(
      "[AI Studio] PostgreSQL query error (fallback used for this call):",
      err instanceof Error ? err.message : ""
    );
    return;
  }
  if (!global._dbOfflineFallback) {
    console.warn(
      "[AI Studio] PostgreSQL temporarily unavailable — using fallback for 15s.",
      err instanceof Error ? err.message : ""
    );
  }
  global._dbOfflineFallback = true;
  global._dbOfflineUntil = Date.now() + 15_000;
}

export function clearDatabaseOffline(): void {
  global._dbOfflineFallback = false;
  global._dbOfflineUntil = undefined;
}

export const createPool = () => {
  if (!isDatabaseConfigured()) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 25000,
    });

    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
      markDatabaseOffline(err);
    });
  }
  return global._postgresPool;
};

let dbInstance: NodePgDatabase<typeof schema>;

try {
  const pool = createPool();
  if (pool) {
    dbInstance = drizzle(pool, { schema });
  } else {
    throw new Error("Database environment variables not configured");
  }
} catch {
  if (isDatabaseConfigured()) {
    console.warn("[AI Studio] Database not connected — using fallback store");
  }
  global._dbOfflineFallback = true;
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    update: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    delete: async () => ({}),
  };
  dbInstance = new Proxy({} as NodePgDatabase<typeof schema>, {
    get: (_target, prop) =>
      prop === "query"
        ? new Proxy({}, { get: () => noOp })
        : async () => [],
  });
}

export const db = dbInstance;
