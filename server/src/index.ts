import fs from "fs/promises";
import type { Server } from "http";
import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { closeDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

async function main(): Promise<void> {
  await fs.mkdir(config.uploadDir, { recursive: true });

  console.log("Applying database migrations...");
  await runMigrations();

  const app = createApp();

  const server: Server = app.listen(config.PORT, () => {
    console.log(
      `Gadam API listening on port ${config.PORT} (${config.NODE_ENV})`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => {
      void closeDb().finally(() => process.exit(0));
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
