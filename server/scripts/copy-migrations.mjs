/**
 * tsc only emits JavaScript, so the generated .sql migration files and their
 * journal have to be copied into dist/ by hand for the runtime migrator to
 * find them.
 */
import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "src", "db", "migrations");
const to = path.join(root, "dist", "db", "migrations");

try {
  await access(from);
} catch {
  console.error(
    `No migrations found at ${from}. Run "npm run db:generate" first.`,
  );
  process.exit(1);
}

await mkdir(path.dirname(to), { recursive: true });
await cp(from, to, { recursive: true });
console.log(`Copied migrations -> ${path.relative(root, to)}`);
