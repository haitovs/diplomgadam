#!/usr/bin/env bash
#
# Builds the application image and packs everything needed to run the stack on
# a machine with no access to Docker Hub, npm or any CDN.
#
#   scripts/bundle.sh [--platform linux/amd64] [--tag v1.0.0]
#
# Produces dist-bundle/tagam-<tag>.tar.gz containing:
#   images.tar        app + postgres + caddy, ready for `docker load`
#   docker-compose.yml, deploy/, scripts/, .env.example
#   INSTALL.md        the three commands to run on the target
#
# On the target machine:
#   tar -xzf tagam-<tag>.tar.gz && cd tagam-<tag>
#   docker load -i images.tar
#   cp .env.example .env && edit .env
#   docker compose up -d
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLATFORM="linux/amd64"
TAG="$(date -u +%Y%m%d)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

APP_IMAGE="tagam-restaurant:${TAG}"
POSTGRES_IMAGE="postgres:16-alpine"
CADDY_IMAGE="caddy:2-alpine"

OUT_DIR="$ROOT/dist-bundle"
STAGE="$OUT_DIR/tagam-${TAG}"

# The map bundle is not in git; without it the image would ship a working site
# with a dead map, which is worse than failing here. These are the files the
# server actually reads at runtime.
for required in tiles.bin tiles.idx style.json fonts; do
  if [[ ! -e "$ROOT/data/maps/$required" ]]; then
    echo "Map assets are incomplete: data/maps/$required is missing." >&2
    echo "Run scripts/prepare-map-assets.sh first." >&2
    exit 1
  fi
done

echo "==> Building $APP_IMAGE for $PLATFORM"
docker build --platform "$PLATFORM" -t "$APP_IMAGE" .

echo "==> Pulling $POSTGRES_IMAGE and $CADDY_IMAGE for $PLATFORM"
docker pull --platform "$PLATFORM" "$POSTGRES_IMAGE"
docker pull --platform "$PLATFORM" "$CADDY_IMAGE"

rm -rf "$STAGE"
mkdir -p "$STAGE/deploy" "$STAGE/scripts"

echo "==> Saving images (this takes a minute)"
docker save -o "$STAGE/images.tar" "$APP_IMAGE" "$POSTGRES_IMAGE" "$CADDY_IMAGE"

cp docker-compose.yml "$STAGE/"
cp .env.example "$STAGE/"
cp deploy/Caddyfile "$STAGE/deploy/"
cp scripts/backup-loop.sh scripts/restore.sh "$STAGE/scripts/"

# Pin the compose file to the tag that was actually built.
sed -i.bak "s|^APP_IMAGE=.*|APP_IMAGE=${APP_IMAGE}|" "$STAGE/.env.example"
rm -f "$STAGE/.env.example.bak"

cat > "$STAGE/INSTALL.md" <<EOF
# Tagam — offline install

Built $(date -u +"%Y-%m-%d %H:%M UTC") for \`${PLATFORM}\`.

This bundle contains everything needed to run the platform. The target machine
needs Docker and Docker Compose, and nothing else — no internet access is
required at any point.

## 1. Load the images

    docker load -i images.tar

That installs three images: \`${APP_IMAGE}\`, \`${POSTGRES_IMAGE}\` and
\`${CADDY_IMAGE}\`.

## 2. Configure

    cp .env.example .env

Edit \`.env\` and set at least:

  * \`POSTGRES_PASSWORD\` — generate one, e.g. \`openssl rand -base64 24\`
  * \`PUBLIC_ORIGIN\` — the URL the site will be reached at

## 3. Start

    docker compose up -d

The site is on port 4080. The database schema is created automatically on first
start.

**The first-run administrator password is printed once to the log:**

    docker compose logs app | grep -A4 "FIRST RUN"

You must change it at first sign-in.

## Optional services

    docker compose --profile caddy up -d     # HTTPS with automatic certificates
    docker compose --profile backup up -d    # nightly database + uploads backup

Automatic certificates need outbound access to Let's Encrypt. Where that is not
available, edit \`deploy/Caddyfile\` to use a supplied certificate or to serve
plain HTTP behind another proxy — the comments at the top show both.

## Restoring a backup

    scripts/restore.sh backups/db-YYYYMMDD-HHMMSS.dump \\
                       backups/uploads-YYYYMMDD-HHMMSS.tar.gz
EOF

echo "==> Compressing"
tar -czf "$OUT_DIR/tagam-${TAG}.tar.gz" -C "$OUT_DIR" "tagam-${TAG}"
rm -rf "$STAGE"

SIZE="$(du -h "$OUT_DIR/tagam-${TAG}.tar.gz" | cut -f1)"
echo
echo "Bundle ready: dist-bundle/tagam-${TAG}.tar.gz ($SIZE)"
echo "Copy it to the target machine and follow INSTALL.md inside."
