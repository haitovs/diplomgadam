import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

describe("migrations", () => {
  it("are idempotent, so a container restart is safe", async () => {
    // The suite has already applied them once in setup; running again must be
    // a no-op rather than an error.
    await expect(runMigrations()).resolves.toBeUndefined();
    await expect(runMigrations()).resolves.toBeUndefined();
  });

  it("create every table the application uses", async () => {
    const result = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tables = result.rows.map((row) => row.table_name as string);

    for (const expected of [
      "admins",
      "audit_log",
      "categories",
      "login_attempts",
      "media",
      "menu_items",
      "menu_sections",
      "sessions",
      "store_categories",
      "store_hours",
      "store_special_hours",
      "store_users",
      "stores",
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it("store money as an integer column", async () => {
    const result = await db.execute(
      sql`SELECT data_type FROM information_schema.columns
          WHERE table_name = 'menu_items' AND column_name = 'price_minor'`,
    );
    expect(result.rows[0].data_type).toBe("integer");
  });

  it("cascade deletes from a store to everything it owns", async () => {
    const result = await db.execute(
      sql`SELECT tc.table_name, rc.delete_rule
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'stores'`,
    );

    const rules = new Map(
      result.rows.map((row) => [row.table_name as string, row.delete_rule as string]),
    );

    for (const table of [
      "store_users",
      "store_hours",
      "store_special_hours",
      "store_categories",
      "menu_sections",
      "menu_items",
      "media",
    ]) {
      expect(rules.get(table)).toBe("CASCADE");
    }
  });
});
