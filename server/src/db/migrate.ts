import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { closeDb, db } from "./client.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Applies any pending migrations. Drizzle records what it has already run in
 * `drizzle.__drizzle_migrations`, so this is safe to call on every boot and is
 * a no-op once the database is current.
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(here, "migrations") });
}

// Allow `npm run db:migrate` to apply migrations without booting the server.
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied.");
      return closeDb();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
