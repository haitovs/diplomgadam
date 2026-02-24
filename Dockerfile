# ── Stage 1: Build Frontend ──────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

RUN npm ci

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ── Stage 2: Build Server ───────────────────────────────
FROM node:18-alpine AS server-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

RUN npm ci

COPY server/ ./server/
RUN npm run build --prefix server

# ── Stage 3: Production Runtime ─────────────────────────
FROM node:18-alpine

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

RUN npm ci --omit=dev && apk del python3 make g++

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
