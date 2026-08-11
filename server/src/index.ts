import fs from "fs/promises";
import type { Server } from "http";
import { createApp } from "./app.js";
import {
  ensureBootstrapAdmin,
  ensureDefaultCategories,
} from "./auth/bootstrap.js";
import { purgeOldLoginAttempts } from "./auth/rate-limit.js";
import { purgeExpiredSessions } from "./auth/sessions.js";
import { config } from "./config/index.js";
import { closeMaps, initMaps } from "./modules/maps/maps.service.js";
import { closeDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

async function main(): Promise<void> {
  await fs.mkdir(config.uploadDir, { recursive: true });

  console.log("Applying database migrations...");
  await runMigrations();

  await ensureBootstrapAdmin();
  await ensureDefaultCategories();

  await initMaps();

  const app = createApp();

  // Housekeeping: expired sessions and stale login-attempt rows would
  // otherwise grow without bound.
  const housekeeping = setInterval(
    () => {
      void purgeExpiredSessions().catch((err) =>
        console.error("Session purge failed", err),
      );
      void purgeOldLoginAttempts().catch((err) =>
        console.error("Login attempt purge failed", err),
      );
    },
    60 * 60 * 1000,
  );
  housekeeping.unref();

  const server: Server = app.listen(config.PORT, () => {
    console.log(
      `Tagam API listening on port ${config.PORT} (${config.NODE_ENV})`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => {
      void closeMaps()
        .then(() => closeDb())
        .finally(() => process.exit(0));
    });
    // Don't let a hung connection keep the container alive forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
