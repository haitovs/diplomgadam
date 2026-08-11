import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../../config/index.js";

/**
 * Serves the offline map bundle: OpenMapTiles vector tiles built with
 * Planetiler, plus the glyphs, sprites and style they need. Everything is read
 * from a local volume, so the map works with no internet access at all.
 */

export const MBTILES_FILE = "turkmenistan.mbtiles";
export const STYLE_FILE = "style.json";

export interface TileMetadata {
  minzoom: number;
  maxzoom: number;
  bounds: [number, number, number, number];
  center: [number, number, number];
  attribution: string;
  format: string;
}

let database: Database.Database | null = null;
let metadata: TileMetadata | null = null;
let unavailableReason: string | null = null;

const DEFAULT_METADATA: TileMetadata = {
  minzoom: 0,
  maxzoom: 15,
  bounds: [51.83271, 35.12355, 66.70892, 42.81253],
  center: [58.3261, 37.9601, 12],
  attribution:
    '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
  format: "pbf",
};

export function mapsPath(...parts: string[]): string {
  return path.join(config.mapsDir, ...parts);
}

/**
 * Opens the tile database once. A missing bundle is not fatal — the rest of
 * the site works fine without a map — so the reason is recorded and the map
 * routes report it instead of the process refusing to start.
 */
export function initMaps(): { available: boolean; reason?: string } {
  const file = mapsPath(MBTILES_FILE);

  if (!fs.existsSync(file)) {
    unavailableReason = `Tile database not found at ${file}. Run scripts/prepare-map-assets.sh before building.`;
    console.warn(`Maps disabled: ${unavailableReason}`);
    return { available: false, reason: unavailableReason };
  }

  try {
    database = new Database(file, { readonly: true, fileMustExist: true });
    const rows = database
      .prepare("SELECT name, value FROM metadata")
      .all() as { name: string; value: string }[];

    const raw = Object.fromEntries(rows.map((r) => [r.name, r.value]));
    const bounds = raw.bounds?.split(",").map(Number);
    const center = raw.center?.split(",").map(Number);

    metadata = {
      minzoom: Number(raw.minzoom ?? DEFAULT_METADATA.minzoom),
      maxzoom: Number(raw.maxzoom ?? DEFAULT_METADATA.maxzoom),
      bounds:
        bounds?.length === 4
          ? (bounds as TileMetadata["bounds"])
          : DEFAULT_METADATA.bounds,
      center:
        center?.length === 3
          ? (center as TileMetadata["center"])
          : DEFAULT_METADATA.center,
      attribution: raw.attribution ?? DEFAULT_METADATA.attribution,
      format: raw.format ?? "pbf",
    };

    console.log(
      `Maps ready: ${MBTILES_FILE} z${metadata.minzoom}-${metadata.maxzoom}`,
    );
    return { available: true };
  } catch (err) {
    unavailableReason = `Could not open tile database: ${(err as Error).message}`;
    console.error(`Maps disabled: ${unavailableReason}`);
    return { available: false, reason: unavailableReason };
  }
}

export const mapsAvailable = () => database !== null;
export const mapsUnavailableReason = () => unavailableReason;
export const tileMetadata = (): TileMetadata => metadata ?? DEFAULT_METADATA;

/**
 * Reads one tile. MBTiles stores rows in TMS order (origin bottom-left) while
 * MapLibre requests XYZ (origin top-left), so the row is flipped here.
 */
export function readTile(z: number, x: number, y: number): Buffer | null {
  if (!database) return null;

  const flippedY = 2 ** z - 1 - y;
  const row = database
    .prepare(
      "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
    )
    .get(z, x, flippedY) as { tile_data: Buffer } | undefined;

  return row?.tile_data ?? null;
}

export function closeMaps(): void {
  database?.close();
  database = null;
}

/**
 * Builds the MapLibre style. The stored file points at the machine it was
 * authored on, so every source, glyph and sprite URL is rewritten to a
 * same-origin path — which is also what lets the whole thing work behind any
 * hostname without reconfiguration.
 */
export function buildStyle(): Record<string, unknown> {
  const file = mapsPath(STYLE_FILE);
  const style = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;

  style.sources = {
    turkmenistan: {
      type: "vector",
      url: "/maps/tiles.json",
    },
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
