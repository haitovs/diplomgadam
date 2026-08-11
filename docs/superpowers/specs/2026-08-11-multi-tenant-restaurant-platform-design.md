# Multi-Tenant Restaurant Platform — Design

Date: 2026-08-11
Status: Approved

## Goal

Turn the existing Ashgabat restaurant-finder demo into a deployable product where restaurant
owners register their own store, manage their listing and menu, and admins moderate the
platform. It must deploy from a self-contained Docker bundle onto a machine with no access to
Docker Hub, npm, or any CDN.

## Decisions

| Question | Decision |
| --- | --- |
| Purpose | Real product with real restaurants |
| Deploy target | VPS now; Turkmen local hosting later, fully offline install |
| Database | PostgreSQL 16 |
| Store onboarding | Open signup, admin approval before publish |
| Seed data | Ship empty; the 30 demo restaurants become a dev-only seed |
| Map | Offline vector tiles bundled in the image, rendered with MapLibre |
| AI concierge | Removed entirely |
| Email | None. Phone is the owner's login; admins reset passwords |
| Reviews / ratings | Removed entirely |
| Visitor accounts | None. Favorites stay in `localStorage` |
| Languages | UI and store content in Turkmen (`tk`), English (`en`), Russian (`ru`) |
| Translation rule | Primary language required, others optional, fallback to primary |
| Insights | Rebuilt from real data |
| Edits after approval | Go live immediately; audit-logged; admin can suspend |
| TLS | Caddy in compose with automatic TLS; switchable profiles for later |
| Offline delivery | `docker save` tarball of app + postgres + caddy |
| Menus | Owner-defined sections containing flat items |
| Geography | Ashgabat only, structured so more cities cost a config entry |
| Testing | Automated tests on auth, tenancy, approval state machine, validation, migrations |
| Visual design | Keep the current Tailwind language, adapt it |
| Docs | Rewrite the six diploma chapters plus new operational docs |

## Approach

Restructure the existing Express server rather than rewriting it. The frontend and its
integration are kept. The server is reorganised into feature modules, each with a thin route
layer over a service layer, so that multi-tenancy is enforced in one place instead of being
duplicated across every handler.

Rejected alternatives: evolving `routes/admin.ts` in place (leaves the tenancy check copy-pasted
across ~25 handlers, which is where cross-tenant bugs come from), and rewriting on NestJS
(discards working code and adds a native Prisma engine binary to smuggle into the offline image).

## Problems in the current code this fixes

1. `/api/admin/*` has no authentication. Only `/login` checks anything; every other admin route
   is reachable by anyone. (`server/src/routes/admin.ts`)
2. Passwords are stored in plaintext, seeded as `admin`/`admin`, and the returned token is
   `base64(username:timestamp)`, which nothing ever verifies.
3. The SQLite file lives inside the source tree at `server/src/db/database.sqlite` and is baked
   into the image; uploads go to `data/uploads` with no volume. Every redeploy destroys all data.
4. No merchant concept exists. One flat `admin_users` table; nothing owns a restaurant.
5. No migrations, no healthcheck, container runs as root, `cors()` is fully open, no rate limiting.
6. Prices are stored as `REAL`.
7. Five hard dependencies on the public internet: Unsplash photos (159 unique, 480 references),
   Google Fonts, unpkg Leaflet marker icons, OSM/ArcGIS map tiles, and the HuggingFace API.

## Architecture

### Stack changes

- PostgreSQL 16 replaces SQLite; Drizzle ORM for access and plain-SQL migration files.
- `better-sqlite3` and the HuggingFace client removed.
- `sharp` added for image processing.
- `maplibre-gl` replaces `leaflet` and `react-leaflet`.
- Base image `node:20-bookworm-slim` (prebuilt glibc `sharp` binaries; alpine would need a
  compiler in the image).
- Passwords hashed with Node's built-in `crypto.scrypt` — no native module to compile.

### Server layout

```
server/src/
  config/        env parsing and validation, fails fast on bad config
  db/            drizzle schema, migrations/, client, dev seed
  auth/          password hashing, sessions, guards, rate limiting
  modules/
    stores/      registration, listing CRUD, approval state machine, hours
    menus/       sections and items
    media/       upload, sharp pipeline, quotas
    admin/       approval queue, roles, audit, impersonation
    public/      search, detail, categories, insights
    maps/        mbtiles tiles, glyphs, sprites, style
  lib/           errors, i18n helpers, pagination
```

### Multilingual content

Translatable fields are JSONB objects keyed by language: `{"tk": "...", "en": "...", "ru": "..."}`.
Each store records a `primary_lang`. Reads resolve to the requested language, falling back to the
store's primary. Only the primary language is required at write time.

Applies to: store name and description, menu section names, menu item names and descriptions,
category names, and rejection/closure notes.

## Data model

| Table | Purpose |
| --- | --- |
| `stores` | The listing. Multilingual name/description, `primary_lang`, status, location, contact, social handles, service options, amenities, policies, closure state, view count. |
| `store_users` | Owner accounts. Phone is the login identifier. Password hash, full name, position, personal phone, `must_change_password`. |
| `store_hours` | One row per opening interval per weekday, so split hours are natural. |
| `store_special_hours` | Date-specific overrides for holidays and Ramadan. |
| `menu_sections` | Owner-defined, ordered, multilingual name. |
| `menu_items` | Belongs to a section. Multilingual name/description, `price_minor` as integer tenge, photo, availability, sort order. |
| `media` | Every uploaded file: kind (`cover`/`gallery`/`menu_item`/`venue_proof`), path, dimensions, bytes, mime. Quotas enforced by counting rows. |
| `categories`, `store_categories` | Admin-managed multilingual cuisine taxonomy, many-to-many. |
| `admins` | Separate from store users. Roles `owner` and `moderator`. |
| `sessions` | Server-side sessions storing a token *hash*, with `impersonated_by_admin_id`. |
| `audit_log` | Actor, action, target, change diff, IP, timestamp. |

### Store status machine

```
                  ┌─────────► rejected (reason, owner may resubmit)
pending ──────────┤
                  └─────────► approved ◄──────► suspended
```

Only `approved` stores are publicly visible. Approved stores edit freely; every edit is
audit-logged.

## Authentication and tenancy

- Passwords: `scrypt` with a per-user random salt; parameters stored alongside the hash so they
  can be raised later without invalidating existing accounts.
- The seeded plaintext `admin`/`admin` account is removed. First run generates a random admin
  password, prints it once to the container log, and forces a change on first login.
- Sessions: 32 random bytes, SHA-256 hashed in the database, delivered as an
  `httpOnly; Secure; SameSite=Lax` cookie. No JWT, so revocation works when a store is suspended.
- Login rate limiting per phone and per IP, with lockout after repeated failures.
- **One guard, `requireStoreAccess`**, resolves the store from the route and checks that the
  session subject owns it or is an admin. Every store-scoped route uses it. Child resources
  (menu items, media) resolve their store through the parent; the store id is never read from the
  request body.
- Every store-scoped service function takes `storeId` as its first argument. No query in the
  store modules runs without a store filter.
- Impersonation issues a normal session tagged with the acting admin. The owner UI shows a
  persistent banner and every write during impersonation is attributed to both actors.
- CORS restricted to same origin in production, Helmet with a CSP, request body size limits.

## Merchant portal (`/store/*`)

Register (phone, password, owner name and position, store name, primary language, venue photos)
→ pending status page → on approval, a dashboard containing:

- Listing editor: info, location picker on the MapLibre map, contact and social, service options,
  amenities and policies.
- Hours editor with split-day support; special hours and a temporary-closure toggle.
- Menu editor: reorderable sections and items, per-item photo, availability toggle.
- Media manager with quota counters.
- A per-field language completeness indicator.

## Admin panel (`/admin/*`)

Approval queue showing venue photos and owner contact side by side, approve, reject with a
reason, suspend and reinstate, an all-stores table, edit any listing, category manager, admin
accounts and roles, audit log viewer, owner password reset, and "view as store".

## Public site

Ratings, reviews and the AI concierge removed. Content renders in the visitor's language with
fallback to the store's primary. Russian added. Menus display by owner-defined section. The map
uses MapLibre against locally served tiles. Insights are computed from real counts.

## Offline assets

| Asset | Source | Handling |
| --- | --- | --- |
| Map tiles | `capar_express/backend/maps/turkmenistan-detail.mbtiles` (93 MB, OpenMapTiles 3.16, Planetiler 0.10.0, z0–15, whole country) | Copied into the image, served by the `maps` module. Overzoom past z15 is expected and normal. |
| Glyphs | Noto Sans PBFs, 5 weights, same source | Copied in, served at `/maps/fonts/{fontstack}/{range}.pbf` |
| Sprites | `sprite.png`, `sprite@2x.png` + json, same source | Copied in, served at `/maps/sprite*` |
| Style | `turkmenistan-style/style.json` | Copied in; hardcoded `192.168.0.185:8080` URLs rewritten to same-origin relative paths |
| Inter font | Currently `@import` from Google Fonts in `frontend/src/index.css:1` | Self-hosted woff2 in the bundle |
| Leaflet marker icons | unpkg | Gone with Leaflet |
| Unsplash photos | 159 hotlinked images | Not needed in production, since the database ships empty. The dev seed downloads them locally. |

Attribution "© OpenMapTiles © OpenStreetMap contributors" is rendered on every map.

## Deployment

Three services: `app`, `postgres`, `caddy`. Named volumes for the database and uploads.

- `scripts/bundle.sh` builds the images and produces one `docker save` tarball containing app,
  postgres and caddy, plus `docker-compose.yml` and `.env.example`. Target machine runs
  `docker load` then `docker compose up -d`. No network access required.
- Nightly `pg_dump` and uploads archive to a mounted host directory, retained N days, with a
  documented one-command restore.
- Healthchecks on all services, app runs as a non-root user, migrations applied on startup.
- Caddy compose profiles: automatic TLS (default), supplied certificate, and HTTP-only, so
  moving to Turkmen hosting is a profile switch rather than a rewrite.

## Testing

Automated coverage on the parts where failure is expensive:

- Password hashing and verification.
- Session issue, validation, expiry and revocation.
- **Tenancy**: store A cannot read or write store B's listing, menu, or media, through every
  route shape including child resources.
- Approval state machine transitions, including invalid ones.
- Input validation and the multilingual required-primary rule.
- Migrations apply cleanly from empty and are idempotent.

UI is verified manually.

## Build order

1. Foundation — dependencies, config, Postgres, Drizzle schema and migrations, compose.
2. Auth — hashing, sessions, guards, rate limiting, audit log.
3. Stores — registration, listing CRUD, approval state machine, hours.
4. Menus — sections and items.
5. Media — upload pipeline, quotas.
6. Admin — queue, roles, impersonation, password reset, categories, audit viewer.
7. Public API — search, detail, categories, insights.
8. Maps — tile, glyph, sprite and style serving.
9. Frontend — remove AI and ratings, add Russian, multilingual rendering, MapLibre swap,
   merchant portal, admin panel rework.
10. Offline assets — fonts, map bundle.
11. Docker — multi-stage build, offline bundle script, backups, healthchecks, hardening.
12. Tests.
13. Documentation rewrite.

## Out of scope

Reviews and ratings, visitor accounts, online ordering, table reservations, payments, SMS or
email delivery, multi-city launch, and a public API for third parties. Each can be added later as
its own project.
