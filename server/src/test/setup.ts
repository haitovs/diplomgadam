import { sql } from "drizzle-orm";
import fs from "fs/promises";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { config } from "../config/index.js";
import { db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

/**
 * The suite runs against a real PostgreSQL database rather than a mock. The
 * things most worth testing here — that one store cannot reach another's data,
 * that a status transition is rejected — live in SQL predicates, so a fake
 * database would test the fake.
 */

// Every table the tests touch. Truncating by name rather than reflecting the
// schema keeps a mistake in this list visible as a failing test.
const TABLES = [
  "audit_log",
  "login_attempts",
  "sessions",
  "menu_items",
  "menu_sections",
  "media",
  "store_categories",
  "store_special_hours",
  "store_hours",
  "store_users",
  "stores",
  "categories",
  "admins",
];

beforeAll(async () => {
  if (!config.DATABASE_URL.includes("test")) {
    throw new Error(
      `Refusing to run tests against ${config.DATABASE_URL}: the database name must contain "test".`,
    );
  }

  await fs.mkdir(config.uploadDir, { recursive: true });
  await runMigrations();
});

beforeEach(async () => {
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`),
  );
});

/**
 * Only the upload directory is cleaned up here.
 *
 * Setup files run once per *test file*, so anything torn down in afterAll —
 * the shared HTTP server, the database pool — would be closed while later
 * files still need it. Both are process-scoped and are released when Vitest
 * ends the worker.
 */
afterAll(async () => {
  await fs.rm(config.uploadDir, { recursive: true, force: true });
});
