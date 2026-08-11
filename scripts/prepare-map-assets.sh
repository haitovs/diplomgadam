#!/usr/bin/env bash
#
# Copies the offline map bundle into data/maps so it can be baked into the
# Docker image. These assets are large (~100 MB) and are therefore kept out of
# git; run this once on a machine that has them before building the image.
#
# Usage:
#   scripts/prepare-map-assets.sh [SOURCE_DIR]
#
# SOURCE_DIR defaults to the Capar Express map directory these assets were
# originally built in (OpenMapTiles schema, produced with Planetiler).
set -euo pipefail

SOURCE="${1:-$HOME/Desktop/Projects/capar_express/backend/maps}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/data/maps"

if [[ ! -d "$SOURCE" ]]; then
  echo "Map source directory not found: $SOURCE" >&2
  echo "Pass the directory as the first argument." >&2
  exit 1
fi

require() {
  if [[ ! -e "$SOURCE/$1" ]]; then
    echo "Missing required asset: $SOURCE/$1" >&2
    exit 1
  fi
}

require "turkmenistan-detail.mbtiles"
require "fonts"
require "sprite.json"
require "sprite.png"
require "turkmenistan-style/style.json"

mkdir -p "$DEST"

echo "Copying vector tiles (this is the large one)..."
cp "$SOURCE/turkmenistan-detail.mbtiles" "$DEST/turkmenistan.mbtiles"

echo "Building the flat tile index..."
# The runtime reads a blob plus a binary index rather than the SQLite file, so
# no native SQLite binding has to ship in the image. See build-tile-index.mjs.
node "$ROOT/scripts/build-tile-index.mjs" "$DEST/turkmenistan.mbtiles"

echo "Removing the source .mbtiles (not needed at runtime)..."
rm -f "$DEST/turkmenistan.mbtiles"

echo "Copying glyphs..."
rm -rf "$DEST/fonts"
cp -R "$SOURCE/fonts" "$DEST/fonts"

echo "Copying sprites..."
for f in sprite.json sprite.png sprite@2x.json sprite@2x.png; do
  [[ -e "$SOURCE/$f" ]] && cp "$SOURCE/$f" "$DEST/$f"
done

echo "Copying style..."
cp "$SOURCE/turkmenistan-style/style.json" "$DEST/style.json"

echo
echo "Map assets ready in data/maps:"
du -sh "$DEST"
find "$DEST" -maxdepth 1 -type f -exec ls -lh {} \; | awk '{print "  ", $9, $5}'
echo "  fonts/: $(ls "$DEST/fonts" | wc -l | tr -d ' ') font stacks"
