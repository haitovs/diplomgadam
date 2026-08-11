# 3. Architecture

## Shape of the system

One Node process serves the API, the built single-page application and the map.
PostgreSQL holds the data. Uploaded photos live on a volume. Caddy in front is
optional.

```
                    ┌──────────────┐
   browser ────────▶│    Caddy     │  optional: TLS
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     app      │  Express + built SPA + map tiles
                    └──┬────────┬──┘
                       │        │
              ┌────────▼──┐  ┌──▼──────────┐
              │ PostgreSQL│  │  uploads    │
              │  (volume) │  │  (volume)   │
              └───────────┘  └─────────────┘
```

Serving the SPA from the same process as the API removes cross-origin
configuration entirely: cookies are same-site, and CORS is closed in production
because a cross-origin request is never legitimate.

## Server structure

```
server/src/
  config/      environment parsing, validated once at boot
  db/          Drizzle schema, SQL migrations, client
  auth/        password hashing, sessions, guards, rate limiting
  lib/         errors, HTTP helpers, i18n, phone, slug, audit
  modules/
    stores/    registration, listing, approval state machine, hours
    menus/     sections and items
    media/     upload pipeline, quotas, delivery
    admin/     moderation, roles, categories, audit
    public/    search, detail, categories, statistics, opening hours
    maps/      tiles, glyphs, sprites, style
```

Each module is a thin route layer over a service layer. Routes validate input
and shape responses; services hold the logic and own the queries. This is what
makes the tenancy rule enforceable: **every store-scoped service function takes
the store id as its first argument and includes it in the WHERE clause.** A rule
that must be remembered in twenty-five handlers is a rule that will be forgotten
in one.

## Tenancy

Two independent mechanisms, so a mistake in either alone is not a breach.

**The guard** decides who may act on which store. `requireStoreAccess` takes the
target from the route parameter when present and otherwise from the signed-in
owner's session. It is never taken from the request body, so no field can
redirect a write at somebody else's restaurant. Administrators pass; an owner
passes only for their own store.

**The queries** make a guessed identifier useless. Menu items carry a
denormalised `store_id` even though their section already implies one, so every
lookup filters on the store directly and a valid id belonging to another
restaurant simply does not match.

Cross-tenant access is exercised in the test suite against every route that
takes an identifier, including reparenting an item into another store's section
and attaching another store's photo.

## Authentication

Server-side sessions rather than JWTs. The deciding factor is revocation:
suspending a restaurant must sign its owners out *now*, and a self-contained
token cannot be withdrawn.

- A session is 32 random bytes. Only its SHA-256 is stored, so the database
  never contains anything that can be replayed.
- Delivered as an `httpOnly`, `SameSite=Lax` cookie, `Secure` when the public
  origin is HTTPS.
- **Administrators and owners use different cookies.** An administrator using
  "view as store" keeps their own session; without this, support would mean
  signing yourself out.
- Passwords use scrypt from Node's standard library — no native module to
  compile, which matters for an image that must build and run anywhere. The
  parameters are stored alongside each hash so they can be raised later without
  invalidating existing accounts.
- Failed sign-ins are counted in the database rather than in memory, so a
  lockout is not cleared by restarting the container.

## Data model

Translatable columns are JSONB keyed by language (`{"tk":…,"en":…,"ru":…}`) with
a per-store primary language. The alternative — three columns per field, or a
translations table — was rejected because every field would need the same
join or the same triplication, and reads always want all languages at once.

| Table | Holds |
| --- | --- |
| `stores` | The listing: multilingual name/description/address, status, location, contact, social handles, service options, amenities, closure state, view count |
| `store_users` | Owner accounts. The phone number is the login |
| `store_hours` | One row per opening interval, so split days and past-midnight closing are ordinary data |
| `store_special_hours` | Date-specific overrides |
| `menu_sections`, `menu_items` | Owner-ordered sections; prices as integer minor units |
| `media` | Every uploaded file with kind, dimensions and size; quotas are enforced by counting rows |
| `categories`, `store_categories` | Multilingual cuisine taxonomy, many-to-many |
| `admins` | Administrators, roles `owner` and `moderator` |
| `sessions` | Token hashes, expiry, and the impersonating administrator |
| `login_attempts` | Throttling state |
| `audit_log` | Actor, action, target, change diff, address, time |

Two choices worth stating plainly:

**Money is an integer.** `price_minor` is tenge, 100 to the manat. The previous
schema used a floating-point column, which is a rounding error waiting to reach
a published price.

**Opening hours are rows, not a string.** One row per interval means two rows
for a day that closes in the afternoon, and a closing time earlier than the
opening time means the venue runs past midnight. Both fall out of the model
instead of being special cases in parsing code.

### Store status

```
           ┌──────────────────────────► rejected ──┐
           │                          (with reason)│
  draft ───┴──► pending ──► approved ◄──► suspended│
    ▲                          │        (with reason)
    └──────────────────────────┴───── resubmit ◄───┘
```

`draft` exists because uploads need a store to attach to: an owner must be able
to add photos and a menu before a moderator ever sees the listing, and the queue
should contain only work the owner considers finished.

## Multilingual reads

A read resolves the requested language, then the store's primary, then any
language with content. A visitor never sees a blank name because a translation
is missing — they see the owner's own words in whichever language exists.

The public API resolves this server-side and returns plain strings; the owner
portal and admin panel receive the raw objects, because those interfaces need to
edit each language and show which are missing.

## Maps

The map is the usual reason a site like this fails on a restricted network, so
it is served entirely by the application: vector tiles, glyph ranges, sprites
and the style, all same-origin, with the style's URLs rewritten at request time
so the deployment works behind any hostname without reconfiguration.

Tiles are a flat blob plus a binary index rather than the original MBTiles.
MBTiles is a SQLite database, and the native binding needed a compiler to
install and then crashed in the container — a poor dependency for an image whose
whole purpose is to run anywhere. Reading a tile is a key/value lookup, so SQLite
is used once on the build machine, through Node's own `node:sqlite`, and never at
runtime. Lookup is a binary search over a sorted key array followed by a
positional read.

## Images

Uploads are decoded rather than trusted: the declared type and the extension are
both ignored, and a file that sharp cannot read is rejected before anything is
written. Each accepted image is normalised for EXIF orientation, stripped of
metadata — location tags do not belong in a public directory — and re-encoded to
WebP with a JPEG fallback at two sizes.

Verification photos are stored in a separate subtree that is not served
statically and reached only through an authenticated route.

## Deployment

Three images, one tarball, loaded with `docker load`. The application image
carries the built SPA and the map bundle; the database and uploads are volumes,
so nothing persistent lives inside the image and a redeploy cannot destroy data.

Migrations run at startup and are idempotent, so the container is safe to restart
and an upgrade needs no separate step.

Caddy is an optional profile. Automatic certificates need outbound access to
Let's Encrypt, which the eventual hosting may not have, so the proxy is
switchable to a supplied certificate or removed entirely without touching
anything else.
