/**
 * Downloads the photographs the demo dataset refers to, once, into
 * data/seed-images/ so the development seed can attach real images.
 *
 * The demo data was curated with a specific photograph per restaurant and per
 * dish; this fetches exactly those rather than picking new ones, so the seeded
 * site looks deliberate instead of random.
 *
 * Needs internet, runs on a developer machine only, and is never part of a
 * deployment. Production ships with an empty database and no stock imagery.
 *
 *   node scripts/fetch-seed-images.mjs
 *
 * Already-downloaded files are skipped, so it is safe to re-run.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const outDir = path.join(dataDir, "seed-images");
const manifestPath = path.join(outDir, "manifest.json");

const CONCURRENCY = 6;

function collectUrls() {
  const urls = new Map(); // url -> list of the keys that reference it

  const restaurants = JSON.parse(
    fs.readFileSync(path.join(dataDir, "restaurants.json"), "utf-8"),
  );
  for (const r of restaurants) {
    if (r.heroImage) urls.set(r.heroImage, true);
    for (const image of r.gallery ?? []) urls.set(image, true);
  }

  const menu = JSON.parse(
    fs.readFileSync(path.join(dataDir, "menu-items.json"), "utf-8"),
  );
  for (const item of menu) {
    if (item.image_url) urls.set(item.image_url, true);
  }

  return [...urls.keys()].filter((u) => /^https?:\/\//.test(u));
}

const nameFor = (url) => `${createHash("sha1").update(url).digest("hex")}.jpg`;

async function download(url, destination) {
  const response = await fetch(url, {
    headers: { "User-Agent": "tagam-seed-image-fetcher" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  // A truncated or error-page response would otherwise be written as a "photo"
  // and fail later, inside the seed, where the cause is much less obvious.
  if (buffer.length < 2048) throw new Error(`suspiciously small (${buffer.length}B)`);
  if (!(buffer[0] === 0xff && buffer[1] === 0xd8)) throw new Error("not a JPEG");

  await fsp.writeFile(destination, buffer);
  return buffer.length;
}

async function main() {
  await fsp.mkdir(outDir, { recursive: true });

  const urls = collectUrls();
  console.log(`${urls.length} distinct photographs referenced by the demo data.`);

  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    : {};

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  const queue = [...urls];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const url = queue.pop();
      if (!url) return;

      const filename = nameFor(url);
      const destination = path.join(outDir, filename);

      if (fs.existsSync(destination)) {
        manifest[url] = filename;
        skipped += 1;
        continue;
      }

      try {
        // Read-modify-write across an await loses increments when several
        // workers interleave, so the size is resolved before it is added.
        const size = await download(url, destination);
        bytes += size;
        manifest[url] = filename;
        downloaded += 1;
        if (downloaded % 20 === 0) console.log(`  ${downloaded} downloaded…`);
      } catch (err) {
        failed += 1;
        console.warn(`  failed: ${url.slice(0, 60)}… (${err.message})`);
      }
    }
  });

  await Promise.all(workers);
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `\nDownloaded ${downloaded}, already present ${skipped}, failed ${failed}.`,
  );
  console.log(`${(bytes / 1024 / 1024).toFixed(1)} MB written to data/seed-images/`);
  if (failed > 0) {
    console.log("Failures are tolerable: the seed simply leaves those without a photo.");
  }
  console.log("\nNow run: npm run db:seed");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
