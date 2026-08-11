# syntax=docker/dockerfile:1
#
# Debian slim rather than Alpine on purpose: sharp ships prebuilt glibc
# binaries, and better-sqlite3 compiles cleanly against glibc. The compiler is
# installed only in the build stages, never in the runtime image.

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 is a devDependency (it builds the tile index) and has no
# prebuilt binary for Node 20, so it compiles from source. The toolchain stays
# in this build stage and never reaches the runtime image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN npm ci

# ── Build the frontend ───────────────────────────────────────────────────────
FROM deps AS frontend-build
WORKDIR /app
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ── Build the server ─────────────────────────────────────────────────────────
FROM deps AS server-build
WORKDIR /app
COPY server/ ./server/
RUN npm run build --prefix server

# ── Production dependencies only ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app

# No toolchain needed here: sharp ships prebuilt binaries and better-sqlite3 is
# a devDependency used only to build the tile index on the build machine.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN npm ci --omit=dev --workspace tagam-restaurant-server --include-workspace-root

# npm hoists workspace dependencies to the root, so this directory usually ends
# up empty. Creating it keeps the runtime COPY valid either way, and still
# carries anything npm did decide to nest.
RUN mkdir -p /app/server/node_modules

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4080 \
    UPLOAD_DIR=/data/uploads \
    MAPS_DIR=/app/maps

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules
COPY package.json ./
COPY server/package.json ./server/

# Compiled server, including the SQL migration files copied in by the build.
COPY --from=server-build /app/server/dist ./server/dist

# Built SPA; the server serves it from ../../public relative to server/dist.
COPY --from=frontend-build /app/frontend/dist ./public

# Offline map bundle: vector tiles, glyphs, sprites and style.
# Populate ./data/maps with scripts/prepare-map-assets.sh before building.
COPY data/maps ./maps

# The uploads volume is created by compose; this makes a bare `docker run` work
# too, and gives the non-root user somewhere to write.
RUN mkdir -p /data/uploads && chown -R node:node /data

USER node

EXPOSE 4080

# No curl in the slim image, so the check runs through node itself.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
