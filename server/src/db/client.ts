import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config/index.js";
import * as schema from "./schema.js";

/**
 * Postgres returns bigint/numeric as strings by default to avoid precision
 * loss. We store money as integers, so parse int8 back to a number.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("Unexpected postgres pool error", err);
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;

export async function closeDb(): Promise<void> {
  await pool.end();
}
