# ── Stage 1: Build Frontend ──────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

RUN npm ci

COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ── Stage 2: Build Server ───────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

RUN npm ci

COPY server/ ./server/
RUN npm run build --prefix server

# Prune to production-only deps
RUN npm prune --omit=dev

# ── Stage 3: Production Runtime ─────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy production node_modules (with compiled native modules)
COPY --from=server-builder /app/node_modules ./node_modules

# Copy server package.json (needed for "type": "module")
COPY server/package.json ./server/

# Copy compiled server
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built frontend into public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy data (restaurant images + seed JSON)
COPY data/ ./data/

ENV NODE_ENV=production
ENV PORT=4080

EXPOSE 4080

CMD ["node", "server/dist/index.js"]
