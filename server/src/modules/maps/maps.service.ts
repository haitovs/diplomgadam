import fs from "fs";
import { open, type FileHandle } from "fs/promises";
import path from "path";
import { config } from "../../config/index.js";

/**
 * Serves the offline map bundle: OpenMapTiles vector tiles built with
 * Planetiler, plus the glyphs, sprites and style they need. Everything is read
 * from local files, so the map works with no internet access at all.
 *
 * Tiles come from a flat blob and a binary index built by
 * scripts/build-tile-index.mjs rather than from the original .mbtiles. Reading
 * MBTiles would mean a native SQLite binding in the runtime image — which needs
 * a compiler to install and segfaulted on the target platform — for what is
 * only ever a key/value lookup.
 */

export const TILES_BIN = "tiles.bin";
export const TILES_IDX = "tiles.idx";
export const TILES_META = "tiles.meta.json";
export const STYLE_FILE = "style.json";

const INDEX_MAGIC = "GDMTILE1";
const HEADER_BYTES = 16;

export interface TileMetadata {
  minzoom: number;
  maxzoom: number;
  bounds: [number, number, number, number];
  center: [number, number, number];
  attribution: string;
  format: string;
}

const DEFAULT_METADATA: TileMetadata = {
  minzoom: 0,
  maxzoom: 15,
  bounds: [51.83271, 35.12355, 66.70892, 42.81253],
  center: [58.3261, 37.9601, 12],
  attribution:
    '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
  format: "pbf",
};

interface TileIndex {
  keys: Float64Array;
  offsets: Float64Array;
  lengths: Uint32Array;
}

let index: TileIndex | null = null;
let blob: FileHandle | null = null;
let metadata: TileMetadata | null = null;
let unavailableReason: string | null = null;

export function mapsPath(...parts: string[]): string {
  return path.join(config.mapsDir, ...parts);
}

/** Must match the packing in scripts/build-tile-index.mjs. */
const packKey = (z: number, x: number, y: number) =>
  z * 2 ** 44 + x * 2 ** 22 + y;

/**
 * Opens the tile bundle. A missing bundle is not fatal — the rest of the site
 * works fine without a map — so the reason is recorded and the map routes
 * report it rather than the process refusing to start.
 */
export async function initMaps(): Promise<{ available: boolean; reason?: string }> {
  const binFile = mapsPath(TILES_BIN);
  const idxFile = mapsPath(TILES_IDX);

  if (!fs.existsSync(binFile) || !fs.existsSync(idxFile)) {
    unavailableReason = `Tile bundle not found in ${config.mapsDir}. Run scripts/prepare-map-assets.sh before building.`;
    console.warn(`Maps disabled: ${unavailableReason}`);
    return { available: false, reason: unavailableReason };
  }

  try {
    const raw = await fs.promises.readFile(idxFile);

    if (raw.subarray(0, 8).toString("ascii") !== INDEX_MAGIC) {
      throw new Error("index file has an unexpected format");
    }

    const count = raw.readUInt32LE(8);
    const keysStart = HEADER_BYTES;
    const offsetsStart = keysStart + count * 8;
    const lengthsStart = offsetsStart + count * 8;
    const expected = lengthsStart + count * 4;

    if (raw.byteLength !== expected) {
      throw new Error(
        `index file is truncated (expected ${expected} bytes, got ${raw.byteLength})`,
      );
    }

    // Copy into typed arrays rather than viewing the Buffer directly: a
    // Buffer's underlying pool is not guaranteed to be 8-byte aligned, which
    // Float64Array requires.
    index = {
      keys: new Float64Array(
        raw.buffer.slice(raw.byteOffset + keysStart, raw.byteOffset + offsetsStart),
      ),
      offsets: new Float64Array(
        raw.buffer.slice(raw.byteOffset + offsetsStart, raw.byteOffset + lengthsStart),
      ),
      lengths: new Uint32Array(
        raw.buffer.slice(raw.byteOffset + lengthsStart, raw.byteOffset + expected),
      ),
    };

    blob = await open(binFile, "r");

    const metaFile = mapsPath(TILES_META);
    if (fs.existsSync(metaFile)) {
      const meta = JSON.parse(await fs.promises.readFile(metaFile, "utf-8")) as Record<
        string,
        string
      >;
      const bounds = meta.bounds?.split(",").map(Number);
      const center = meta.center?.split(",").map(Number);
      metadata = {
        minzoom: Number(meta.minzoom ?? DEFAULT_METADATA.minzoom),
        maxzoom: Number(meta.maxzoom ?? DEFAULT_METADATA.maxzoom),
        bounds:
          bounds?.length === 4
            ? (bounds as TileMetadata["bounds"])
            : DEFAULT_METADATA.bounds,
        center:
          center?.length === 3
            ? (center as TileMetadata["center"])
            : DEFAULT_METADATA.center,
        attribution: meta.attribution ?? DEFAULT_METADATA.attribution,
        format: meta.format ?? "pbf",
      };
    } else {
      metadata = DEFAULT_METADATA;
    }

    unavailableReason = null;
    console.log(
      `Maps ready: ${count.toLocaleString()} tiles, z${metadata.minzoom}-${metadata.maxzoom}`,
    );
    return { available: true };
  } catch (err) {
    unavailableReason = `Could not open tile bundle: ${(err as Error).message}`;
    console.error(`Maps disabled: ${unavailableReason}`);
    index = null;
    blob = null;
    return { available: false, reason: unavailableReason };
  }
}

export const mapsAvailable = () => index !== null && blob !== null;
export const mapsUnavailableReason = () => unavailableReason;
export const tileMetadata = (): TileMetadata => metadata ?? DEFAULT_METADATA;

/** Binary search over the sorted key array. Returns -1 when absent. */
function findTile(key: number): number {
  if (!index) return -1;
  let low = 0;
  let high = index.keys.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const value = index.keys[mid];
    if (value === key) return mid;
    if (value < key) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

/**
 * Reads one tile. The index already stores XYZ coordinates, so no flipping is
 * needed here. Returns null for a tile that does not exist, which is normal for
 * empty areas.
 */
export async function readTile(
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  if (!index || !blob) return null;

  const position = findTile(packKey(z, x, y));
  if (position === -1) return null;

  const length = index.lengths[position];
  const buffer = Buffer.allocUnsafe(length);
  await blob.read(buffer, 0, length, index.offsets[position]);
  return buffer;
}

export async function closeMaps(): Promise<void> {
  await blob?.close().catch(() => undefined);
  blob = null;
  index = null;
}

/**
 * Builds the MapLibre style. The stored file points at the machine it was
 * authored on, so every source, glyph and sprite URL is rewritten to a
 * same-origin path — which is also what lets the whole thing work behind any
 * hostname without reconfiguration.
 */
export function buildStyle(): Record<string, unknown> {
  const style = JSON.parse(
    fs.readFileSync(mapsPath(STYLE_FILE), "utf-8"),
  ) as Record<string, unknown>;

  style.sources = {
    turkmenistan: { type: "vector", url: "/maps/tiles.json" },
  };
  style.glyphs = "/maps/fonts/{fontstack}/{range}.pbf";
  style.sprite = "/maps/sprite";

  return style;
}

export function buildTileJson(): Record<string, unknown> {
  const meta = tileMetadata();
  return {
    tilejson: "2.2.0",
    name: "Turkmenistan",
    format: meta.format,
    tiles: ["/maps/tiles/{z}/{x}/{y}.pbf"],
    minzoom: meta.minzoom,
    maxzoom: meta.maxzoom,
    bounds: meta.bounds,
    center: meta.center,
    attribution: meta.attribution,
  };
}
