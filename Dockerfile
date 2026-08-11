# syntax=docker/dockerfile:1
#
# Debian slim rather than Alpine, because sharp ships prebuilt binaries against
# glibc and would otherwise have to be compiled. Nothing in the tree needs a
# compiler: the only packages with install scripts are esbuild's, which are
# prebuilt too, so no build toolchain is installed in any stage.

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# This project is built for somewhere with unreliable international bandwidth,
# and a default `npm ci` gives up on the first dropped connection part-way
# through several hundred packages. The cache mount keeps whatever a failed
# attempt did manage to fetch, so a retry resumes instead of starting over, and
# the retry settings ride out a drop rather than aborting the build.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=600000

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

# --ignore-scripts, for a specific reason rather than as a blanket policy.
#
# Nothing in this tree has an install script of its own, and the only
# dependency that does is esbuild, whose script copies its prebuilt binary into
# place and then runs it to check the version. That last step fails with
# ETXTBSY when the image is cross-built for another architecture — the binary
# has just been written and QEMU cannot execute it yet — which made it
# impossible to produce an amd64 image on an arm64 machine, and that is exactly
# how this project is delivered. The copy is an optimisation esbuild names as
# such; without it esbuild resolves the same binary from its platform package
# at run time, which is why the frontend build below still works.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

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

ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=600000

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts \
    --workspace tagam-restaurant-server --include-workspace-root

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
