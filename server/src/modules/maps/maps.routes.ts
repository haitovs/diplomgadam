import express, { Router } from "express";
import { z } from "zod";
import { AppError, notFound } from "../../lib/errors.js";
import { asyncHandler } from "../../lib/http.js";
import {
  buildStyle,
  buildTileJson,
  mapsAvailable,
  mapsPath,
  mapsUnavailableReason,
  readTile,
  tileMetadata,
} from "./maps.service.js";

const router = Router();

const tileParams = z.object({
  z: z.coerce.number().int().min(0).max(22),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
});

const requireMaps = () => {
  if (!mapsAvailable()) {
    throw new AppError(
      503,
      "maps_unavailable",
      mapsUnavailableReason() ?? "Map data is not installed",
    );
  }
};

router.get(
  "/status",
  (_req, res) => {
    res.json({
      available: mapsAvailable(),
      reason: mapsUnavailableReason(),
      ...(mapsAvailable() ? tileMetadata() : {}),
    });
  },
);

router.get(
  "/style.json",
  asyncHandler(async (_req, res) => {
    requireMaps();
    res.set("Cache-Control", "public, max-age=3600");
    res.json(buildStyle());
  }),
);

router.get(
  "/tiles.json",
  asyncHandler(async (_req, res) => {
    requireMaps();
    res.set("Cache-Control", "public, max-age=3600");
    res.json(buildTileJson());
  }),
);

router.get(
  "/tiles/:z/:x/:y.pbf",
  asyncHandler(async (req, res) => {
    requireMaps();
    const parsed = tileParams.safeParse(req.params);
    if (!parsed.success) throw notFound("Tile not found");

    const { z, x, y } = parsed.data;
    const max = 2 ** z;
    if (x >= max || y >= max) throw notFound("Tile not found");

    const tile = readTile(z, x, y);
    if (!tile) {
      // Empty areas legitimately have no tile. 204 keeps MapLibre quiet,
      // whereas a 404 makes it log an error for every blank tile.
      res.status(204).end();
      return;
    }

    res.set({
      "Content-Type": "application/x-protobuf",
      // Planetiler stores tiles gzipped; served as-is with the encoding
      // declared so the browser inflates them.
      "Content-Encoding": "gzip",
      "Cache-Control": "public, max-age=2592000, immutable",
    });
    res.send(tile);
  }),
);

/** Glyph ranges and sprites are plain files inside the map volume. */
router.use(
  "/fonts",
  express.static(mapsPath("fonts"), {
    index: false,
    dotfiles: "ignore",
    maxAge: "30d",
    immutable: true,
    fallthrough: false,
  }),
);

/**
 * Sprites, by explicit allow-list. Serving the map directory statically would
 * also hand out the 89 MB tile database as a plain download, so only these
 * four filenames are reachable.
 */
const SPRITE_FILES = new Set([
  "sprite.json",
  "sprite.png",
  "sprite@2x.json",
  "sprite@2x.png",
]);

router.get(
  "/:file",
  asyncHandler(async (req, res) => {
    const file = req.params.file;
    if (!SPRITE_FILES.has(file)) throw notFound("Not found");

    res.sendFile(mapsPath(file), {
      headers: { "Cache-Control": "public, max-age=2592000" },
    });
  }),
);

export default router;
