# 4. Implementation

This chapter covers the parts where the interesting decisions are, rather than
narrating every file.

## Tenancy enforcement

The guard, in `server/src/auth/guards.ts`, is the only place that decides whether
a request may touch a store:

```ts
export function requireStoreAccess(): RequestHandler {
  return (req, _res, next) => {
    const fromRoute = req.params.storeId;
    const fromSession = req.auth?.storeUser?.storeId;
    const target = fromRoute ?? fromSession;

    if (!target) return next(unauthorized("Store sign-in required"));
    if (!UUID_RE.test(target)) return next(notFound("Store not found"));

    if (req.auth?.admin) {           // administrators reach any store
      req.storeId = target;
      return next();
    }
    if (fromSession !== target) {
      return next(forbidden("You do not have access to this store"));
    }
    req.storeId = target;
    next();
  };
}
```

The target is never read from the request body. Child resources — menu items,
photos — are mounted under a route that carries the store, so they inherit this
check instead of repeating it.

The second layer is in the services. Every store-scoped query names the store:

```ts
const [item] = await db
  .update(menuItems)
  .set(patch)
  .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, storeId)))
  .returning();

if (!item) throw notFound("Menu item not found");
```

An item id belonging to another restaurant matches nothing and resolves to "not
found" rather than to somebody else's dish.

## Passwords and sessions

scrypt from `node:crypto`, with the parameters embedded in the stored value:

```
scrypt$32768$8$1$<salt base64>$<derived key base64>
```

Verification reads the parameters out of the stored string rather than assuming
today's values, so the cost can be raised later without invalidating existing
accounts. `needsRehash` reports when a stored hash is weaker than current policy,
and sign-in quietly upgrades it.

Two details that are easy to get wrong:

**scrypt's memory ceiling.** N=2^15 with r=8 needs exactly 32 MB, which is
Node's default `maxmem`, so the call throws unless `maxmem` is raised
explicitly.

**Account enumeration.** When no account matches, the code still verifies
against a real hash of a random value, so a missing user costs the same work as
a wrong password and the response cannot be used to discover which accounts
exist.

## Opening hours

Stored as intervals and evaluated in application code, because the answer
depends on wall-clock time, several intervals per day, and dates that override
the weekly pattern.

Turkmenistan is UTC+5 with no daylight saving, so a fixed offset is correct and
avoids depending on the container carrying a timezone database:

```ts
export function localNow(now: Date = new Date()): LocalNow {
  const shifted = new Date(now.getTime() + ASHGABAT_UTC_OFFSET_MINUTES * 60_000);
  const jsDay = shifted.getUTCDay();          // 0 = Sunday
  return {
    weekday: (jsDay + 6) % 7,                 // shift so Monday is 0
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    date: shifted.toISOString().slice(0, 10),
  };
}
```

Past-midnight closing is handled by also examining the previous day's intervals:
an interval whose closing time is earlier than its opening time is still running
if the current time is before that closing time.

Filtering by "open now" therefore happens after the database query rather than
inside it. That is a deliberate trade: the city has hundreds of restaurants, not
millions, and expressing this in SQL would be far harder to read than it is
worth. The reason is recorded at the call site so a future reader does not
mistake it for an oversight.

## The image pipeline

Uploads are buffered in memory, because every image is re-encoded and nothing
the client sent is ever written to disk in its original form.

```ts
try {
  pipeline = sharp(buffer, { failOn: "error" });
  metadata = await pipeline.metadata();
} catch {
  throw unprocessable("That file is not a readable image");
}
```

The declared mimetype and the file extension are both ignored. A script renamed
to `.jpg` fails here rather than reaching the public directory.

Each accepted image produces four files: WebP and JPEG at 1600px and 480px.
`.rotate()` applies the EXIF orientation and sharp then drops all metadata by
default, so location tags never reach a served file. If any variant fails, the
partial files are removed before the error propagates — no half-written upload
is left behind.

Verification photos go to a `private/` subtree that is not served statically:

```ts
export function mediaUrl(row, variant, ext): string {
  if (isPrivateKind(row.kind)) return `/api/media/${row.id}/${variant}.${ext}`;
  return `/uploads/public/${row.storeId}/${row.filename}.${variant}.${ext}`;
}
```

The authenticated route serves them to the reviewing administrator or the owner
who submitted them, and refuses everyone else.

## Serving the map

The build machine converts the MBTiles into three files:

- `tiles.bin` — distinct tile blobs, concatenated
- `tiles.idx` — a sorted binary index: packed key, offset, length
- `tiles.meta.json` — the metadata table

The key packs coordinates into a single float64:

```js
const packKey = (z, x, y) => z * 2 ** 44 + x * 2 ** 22 + y;
```

At z ≤ 22 both x and y stay below 2²², so the key stays inside the 53-bit
integer range a double represents exactly.

Two things fall out of the conversion. MBTiles stores rows bottom-left while
MapLibre requests top-left, so the flip happens once at build time and the
runtime does no coordinate arithmetic. And the Planetiler layout already
separates coordinates from blobs, so reading those two tables directly reuses
the deduplication it had already done — 540,592 tiles share 178,241 distinct
blobs, which is why the served bundle is 70 MB against an 89 MB source.

At runtime the index is loaded into typed arrays and each request is a binary
search plus a positional read. The index is copied out of the file buffer rather
than viewed in place, because a Node `Buffer` comes from a pool with no
alignment guarantee and `Float64Array` requires eight-byte alignment.

## Multilingual content

A translatable field is a JSONB object; resolution walks requested → primary →
anything:

```ts
export function pickLocalized(value, lang, primaryLang): string {
  if (!value) return "";
  const requested = value[lang]?.trim();
  if (requested) return requested;
  const primary = value[primaryLang]?.trim();
  if (primary) return primary;
  for (const l of LANGS) {
    const fallback = value[l]?.trim();
    if (fallback) return fallback;
  }
  return "";
}
```

Whitespace counts as absent, so a field containing a stray space still falls
back rather than rendering as a blank line.

In the frontend, the dictionary is typed by deriving the key union from the
Turkmen object and typing the other two as `Record<TranslationKey, string>`. A
missing or misspelled key is a compile error — which is how the retired keys
from the removed features were found rather than discovered as blank labels in
the interface.

## Money

Prices are integer tenge everywhere: in the database, over the API, and in the
client until the moment of display.

Display and input formatting are separate functions, which is not fussiness. A
displayed price uses the locale's thousands separator; an input must not, because
`1,234` and `45.999` are indistinguishable to a parser, and guessing wrong
multiplies a price by a thousand. `parsePrice` accepts what people actually type
— `45`, `45.50`, `45,50`, `1 200` — treats a lone separator as the decimal one,
and rejects anything ambiguous so it surfaces as a validation message instead of
a wrong price.

## The frontend

Vite, React and TanStack Query, with sessions in cookies, so "am I signed in?"
is answered by asking the server. A 401 is a valid answer rather than an error:

```ts
queryFn: async () => {
  try {
    return await storeApi.me();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
},
retry: false,
```

Two size decisions were driven by the target network. The logo shipped at
4946×4946 pixels and 4.3 MB while being displayed at 32 — resizing it took the
built site from 7.1 MB to 2.9 MB. And the charting library was removed: every
figure on the statistics page is single-series magnitude, which reads better as
labelled bar rows and saves roughly 100 KB compressed. Values are labelled
directly, so magnitude is never carried by colour alone, and the bar fill is
stepped per theme — `brand-600` on light at 4.45:1 and `brand-400` on dark at
8.11:1, both above the 3:1 floor for graphical objects.

## Configuration

The environment is parsed once at startup and the process exits with a specific
message if anything is wrong, rather than failing later in a confusing place.

One detail worth recording: Compose renders an unset optional variable as an
**empty string**, not as an absent one, so `${BOOTSTRAP_ADMIN_PASSWORD:-}`
arrives as `""` and fails an optional field's own validation. Empty values are
therefore stripped before parsing:

```ts
const presentEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);
```

Without this, the documented default — leave the password blank and one is
generated — crash-looped every deployment.
