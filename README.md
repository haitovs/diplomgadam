# Tagam — restaurant platform for Ashgabat

A restaurant discovery site where the restaurants maintain their own listings.
Owners register, describe their venue, build a menu and submit it; an
administrator reviews and publishes it. Visitors browse in Turkmen, English or
Russian.

The whole thing runs from a single Docker bundle with **no internet access at
all** — including the map.

## What it does

**For visitors.** Search and filter approved restaurants by cuisine,
neighbourhood, price and amenities, or by whether they are open right now. Each
listing has a menu with prices, opening hours, contact details, photos and a map
location. Favourites are kept in the browser; there are no visitor accounts and
no personal data is collected.

**For restaurant owners.** Register with a phone number, fill in the listing
across three languages, set opening hours (including split days and past-midnight
closing), build a menu of owner-ordered sections, upload photos, and submit for
review. Once approved, edits go live immediately — prices change weekly and
should not wait in a queue.

**For administrators.** A review queue showing each applicant's venue photos and
owner contact side by side, approve/reject with a reason, suspend and reinstate,
a category manager, administrator accounts with owner and moderator roles, owner
password resets, "view as store" for support, and an audit log of who changed
what.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind, React Router, TanStack Query, Zustand, MapLibre GL |
| Backend | Node 20, Express 4, TypeScript, Drizzle ORM, Zod, sharp |
| Database | PostgreSQL 16 |
| Maps | OpenMapTiles vector tiles built with Planetiler, served from the container |
| Deployment | Docker Compose, optional Caddy for TLS |

## Running it locally

You need Node 20+ and a PostgreSQL 16 server.

```bash
npm install

# A database for development
createdb tagam_dev

cp server/.env.sample server/.env
# Edit DATABASE_URL if your Postgres is not on port 5433

npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4080

On first start the server creates an administrator and prints its password
**once**:

```
════════════════════════════════════════════════════════════════
  FIRST RUN — administrator account created
  username: admin
  password: ....-....-....-....
════════════════════════════════════════════════════════════════
```

You must change it at first sign-in.

### The map

Map assets are large (~100 MB) and are not in git. Populate them once:

```bash
scripts/prepare-map-assets.sh [path/to/mbtiles/directory]
```

This copies the tiles, glyphs, sprites and style into `data/maps/` and converts
the MBTiles into a flat blob plus a binary index, which is what the server reads.
Without it everything works except the map, which reports that its data is
missing.

### Demo data

Production ships with an empty database. For a populated site to develop or
demonstrate against:

```bash
node scripts/fetch-seed-images.mjs   # once: downloads the demo photographs
npm run db:seed                      # 30 restaurants, menus, hours, photos
```

The fetch script needs internet and runs on your machine only; the images are
gitignored and never reach a deployment. Seeded owner accounts sign in with
`+993 65900000` (and upward) and the password printed by the seed.

## Testing

```bash
npm test          # server suite (needs a database) plus frontend unit tests
```

The server suite runs against a real PostgreSQL database — create `tagam_test`
first, or point `TEST_DATABASE_URL` at one. It covers password hashing, session
lifecycle, cross-tenant access, the approval state machine, validation and
migrations.

There is also an end-to-end check against a running deployment:

```bash
scripts/smoke-test.sh http://localhost:4080 admin 'your-admin-password'
```

## Deploying

```bash
scripts/prepare-map-assets.sh     # once, if you haven't already
scripts/bundle.sh --tag v1.0.0    # produces dist-bundle/tagam-v1.0.0.tar.gz
```

Copy the tarball to the server and follow the `INSTALL.md` inside it. In short:
`docker load -i images.tar`, fill in `.env`, `docker compose up -d`.

Full details, including HTTPS and backups, are in
[`docs/deployment.md`](docs/deployment.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/deployment.md`](docs/deployment.md) | Installing, upgrading, TLS, backups and restores |
| [`docs/admin-guide.md`](docs/admin-guide.md) | Reviewing applications and running the platform |
| [`docs/store-owner-guide.md`](docs/store-owner-guide.md) | What a restaurant owner needs to do |
| [`docs/01_project_overview.md`](docs/01_project_overview.md) | Context, users and scope |
| [`docs/02_requirements.md`](docs/02_requirements.md) | Functional and non-functional requirements |
| [`docs/03_architecture.md`](docs/03_architecture.md) | System design and data model |
| [`docs/04_implementation.md`](docs/04_implementation.md) | How the significant parts are built |
| [`docs/05_validation.md`](docs/05_validation.md) | Testing strategy and results |
| [`docs/06_diploma_outline.md`](docs/06_diploma_outline.md) | Chapter plan for the written thesis |

## Repository layout

```
frontend/          React SPA — public site, owner portal, admin panel
server/            Express API
  src/config/      environment parsing, validated at boot
  src/db/          Drizzle schema and SQL migrations
  src/auth/        passwords, sessions, guards, rate limiting
  src/modules/     stores, menus, media, admin, public, maps
  src/test/        integration tests
data/maps/         offline map bundle (not in git)
data/uploads/      uploaded photos (not in git; a volume in production)
deploy/            Caddyfile
scripts/           asset preparation, bundling, backup, restore, smoke test
docs/              documentation
```

## Licensing and attribution

Map data is © OpenStreetMap contributors, ODbL, rendered through the
OpenMapTiles schema. The attribution is displayed on every map, as the licences
require.
