import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

declare global {
  var _postgresPool: Pool | undefined;
  var _dbOfflineFallback: boolean | undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    (process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER) ||
      process.env.DATABASE_URL
  );
}

export function isMemoryFallbackActive(): boolean {
  return !isDatabaseConfigured() || Boolean(global._dbOfflineFallback);
}

export function markDatabaseOffline(err?: unknown): void {
  if (!global._dbOfflineFallback) {
    console.warn(
      "[AI Studio] PostgreSQL unavailable — using in-memory fallback store.",
      err instanceof Error ? err.message : ""
    );
    global._dbOfflineFallback = true;
  }
}

export const createPool = () => {
  if (!isDatabaseConfigured()) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool(
      process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            max: 10,
            connectionTimeoutMillis: 5000,
          }
        : {
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 10,
            connectionTimeoutMillis: 5000,
          }
    );

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
    console.warn("[AI Studio] Database not connected — using mock");
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
