/**
 * Converts an .mbtiles file into a flat blob plus a binary index.
 *
 * MBTiles is a SQLite database, which would mean shipping a native SQLite
 * binding in the runtime image. That binding needs a compiler to install and
 * segfaulted on the target platform, both of which work against the goal of an
 * image that runs anywhere with no downloads. Reading tiles is only ever a
 * key/value lookup, so SQLite is used once here — via Node's built-in
 * `node:sqlite`, so there is nothing to install at all — and never at runtime.
 *
 * Output, written next to the source:
 *   tiles.bin        distinct tile blobs, concatenated
 *   tiles.idx        sorted binary index for lookup
 *   tiles.meta.json  the metadata table
 *
 * Requires Node 22 or newer. Usage:
 *   node scripts/build-tile-index.mjs data/maps/turkmenistan.mbtiles
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

let DatabaseSync;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch {
  console.error(
    `node:sqlite is unavailable on Node ${process.version}. This script needs Node 22 or newer.`,
  );
  console.error("It only runs on the build machine; the server does not need it.");
  process.exit(1);
}

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-tile-index.mjs <file.mbtiles>");
  process.exit(1);
}
if (!fs.existsSync(source)) {
  console.error(`Not found: ${source}`);
  process.exit(1);
}

const dir = path.dirname(source);
const binPath = path.join(dir, "tiles.bin");
const idxPath = path.join(dir, "tiles.idx");
const metaPath = path.join(dir, "tiles.meta.json");

const db = new DatabaseSync(source, { readOnly: true });

// Metadata first, so a corrupt tileset fails before writing tens of megabytes.
const metaRows = db.prepare("SELECT name, value FROM metadata").all();
const meta = Object.fromEntries(metaRows.map((r) => [r.name, r.value]));
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

/**
 * Packs (z, x, y) into one number. At z<=22 both x and y stay below 2^22, so
 * the key fits comfortably inside a float64's 53-bit integer range.
 */
const packKey = (z, x, y) => z * 2 ** 44 + x * 2 ** 22 + y;

const hasTable = (name) =>
  db
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?")
    .get(name).n > 0;

/**
 * Planetiler splits an mbtiles into tiles_shallow (coordinates → blob id) and
 * tiles_data (distinct blobs), which means the deduplication has already been
 * done. Reading those two tables directly is both faster and exactly faithful
 * to what the file already says. A conventional single-table mbtiles falls back
 * to hashing blobs to find the duplicates itself.
 */
const shallow = hasTable("tiles_shallow") && hasTable("tiles_data");

const out = fs.openSync(binPath, "w");
let offset = 0;

const keys = [];
const offsets = [];
const lengths = [];
let duplicates = 0;

if (shallow) {
  console.log("Planetiler layout detected: reading tiles_data and tiles_shallow.");

  const offsetById = new Map();
  const lengthById = new Map();

  let cursor = -1;
  for (;;) {
    const rows = db
      .prepare(
        "SELECT tile_data_id AS id, tile_data AS data FROM tiles_data " +
          "WHERE tile_data_id > ? ORDER BY tile_data_id LIMIT 2000",
      )
      .all(cursor);
    if (rows.length === 0) break;

    for (const row of rows) {
      cursor = row.id;
      const data = Buffer.from(row.data);
      offsetById.set(row.id, offset);
      lengthById.set(row.id, data.length);
      fs.writeSync(out, data);
      offset += data.length;
    }
  }
  console.log(`  ${offsetById.size.toLocaleString()} distinct blobs written`);

  let z = -1;
  let x = -1;
  let y = -1;
  for (;;) {
    const rows = db
      .prepare(
        "SELECT zoom_level AS z, tile_column AS x, tile_row AS y, tile_data_id AS id " +
          "FROM tiles_shallow WHERE (zoom_level, tile_column, tile_row) > (?, ?, ?) " +
          "ORDER BY zoom_level, tile_column, tile_row LIMIT 5000",
      )
      .all(z, x, y);
    if (rows.length === 0) break;

    for (const row of rows) {
      ({ z, x, y } = row);
      const blobOffset = offsetById.get(row.id);
      if (blobOffset === undefined) continue; // dangling reference; skip it
      // MBTiles stores rows in TMS order (origin bottom-left); flipping to XYZ
      // here means the runtime does no coordinate maths at all.
      keys.push(packKey(row.z, row.x, 2 ** row.z - 1 - row.y));
      offsets.push(blobOffset);
      lengths.push(lengthById.get(row.id));
    }

    if (keys.length % 100_000 < 5000) {
      console.log(`  ${keys.length.toLocaleString()} tiles mapped`);
    }
  }
  duplicates = keys.length - offsetById.size;
} else {
  console.log("Single-table mbtiles: deduplicating blobs by hash.");

  const seen = new Map();
  let z = -1;
  let x = -1;
  let y = -1;

  for (;;) {
    const rows = db
      .prepare(
        "SELECT zoom_level AS z, tile_column AS x, tile_row AS y, tile_data AS data " +
          "FROM tiles WHERE (zoom_level, tile_column, tile_row) > (?, ?, ?) " +
          "ORDER BY zoom_level, tile_column, tile_row LIMIT 5000",
      )
      .all(z, x, y);
    if (rows.length === 0) break;

    for (const row of rows) {
      ({ z, x, y } = row);
      const data = Buffer.from(row.data);
      const digest = createHash("sha1").update(data).digest("base64");
      const existing = seen.get(digest);

      keys.push(packKey(row.z, row.x, 2 ** row.z - 1 - row.y));
      lengths.push(data.length);

      if (existing === undefined) {
        offsets.push(offset);
        seen.set(digest, offset);
        fs.writeSync(out, data);
        offset += data.length;
      } else {
        offsets.push(existing);
        duplicates += 1;
      }
    }

    if (keys.length % 100_000 < 5000) {
      console.log(`  ${keys.length.toLocaleString()} tiles read`);
    }
  }
}

fs.closeSync(out);
db.close();

const count = keys.length;
if (count === 0) {
  console.error("No tiles found. Is this a valid .mbtiles file?");
  process.exit(1);
}

// Sort by key so the runtime can binary-search.
const order = Array.from({ length: count }, (_, i) => i).sort(
  (a, b) => keys[a] - keys[b],
);

const sortedKeys = new Float64Array(count);
const sortedOffsets = new Float64Array(count);
const sortedLengths = new Uint32Array(count);
for (let i = 0; i < count; i += 1) {
  const from = order[i];
  sortedKeys[i] = keys[from];
  sortedOffsets[i] = offsets[from];
  sortedLengths[i] = lengths[from];
}

const header = Buffer.alloc(16);
header.write("GDMTILE1", 0, "ascii");
header.writeUInt32LE(count, 8);

fs.writeFileSync(
  idxPath,
  Buffer.concat([
    header,
    Buffer.from(sortedKeys.buffer),
    Buffer.from(sortedOffsets.buffer),
    Buffer.from(sortedLengths.buffer),
  ]),
);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
console.log(`\nWrote:`);
console.log(`  ${path.basename(binPath)}  ${mb(fs.statSync(binPath).size)}`);
console.log(`  ${path.basename(idxPath)}  ${mb(fs.statSync(idxPath).size)}`);
console.log(`  ${path.basename(metaPath)}`);
console.log(
  `\n${count.toLocaleString()} tiles indexed; ${duplicates.toLocaleString()} shared a blob with another tile.`,
);
console.log(`The .mbtiles file is no longer needed at runtime.`);
