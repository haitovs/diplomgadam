# 5. Validation

## Strategy

Testing effort went where failure would be expensive: authentication, tenancy
isolation, the moderation state machine, and anything handling money. The user
interface is verified by hand, on the grounds that a rendering mistake is
obvious and cheap to correct, whereas one restaurant reading another's data is
neither.

Server tests run against a **real PostgreSQL database**. The properties worth
proving — that a query cannot reach another tenant's rows, that a status
transition is refused — live in SQL predicates, and a mocked database would only
prove the mock behaves as written.

## Automated coverage

```
 ✓ src/test/auth.test.ts            (19 tests)
 ✓ src/test/tenancy.test.ts         (20 tests)
 ✓ src/test/approval.test.ts        (17 tests)
 ✓ src/modules/public/opening-hours.test.ts (17 tests)
 ✓ src/lib/lib.test.ts              (17 tests)
 ✓ src/auth/password.test.ts         (9 tests)
 ✓ src/test/public.test.ts           (7 tests)
 ✓ src/test/migrations.test.ts       (4 tests)

 Test Files  8 passed (8)
      Tests  110 passed (110)
```

Plus 15 frontend unit tests covering money formatting and parsing, and 20
browser tests described below.

### Tenancy

Two restaurants are registered, and every route that accepts an identifier is
called with an identifier belonging to the other:

| Attempt | Result |
| --- | --- |
| Read another store's listing | Own listing returned |
| Update another store's menu item | 404 |
| Delete another store's menu item | 404 |
| Create an item inside another store's section | 400 |
| Move an own item into another store's section | 400 |
| Reorder another store's items | 400 |
| Update or delete another store's section | 404 |
| Delete another store's photo | 404 |
| Attach another store's photo to an own item | 400 |
| Reorder another store's photos | 400 |
| Reach any admin route as an owner | 401 |
| Reach any owner route with no session | 401 |

A final assertion confirms the target restaurant's data is unchanged after all
of it.

### Verification photos

| Caller | Result |
| --- | --- |
| Anonymous | 403 |
| A different restaurant | 403 |
| The owner who uploaded it | 200 |
| An administrator | 200 |
| Anonymous, via the public static path | 404 |

### Authentication

Cookies are `HttpOnly` and `SameSite=Lax`; administrator and owner sessions do
not substitute for one another; sign-out invalidates immediately; a forged token
is refused.

A wrong password and an unknown account produce an identical response. Lockout
triggers at the configured threshold and then refuses even the correct password;
failures are counted per account, so locking one does not lock another.

Changing a password invalidates other sessions but not the one performing the
change — signing yourself out of the page you are standing on is a bug, not
security. A forced password change blocks every other action until completed.

### Approval state machine

Submission is refused while anything is missing, and the response names each
missing item. A listing cannot be submitted twice, approved unless pending,
rejected without a reason, or suspended unless published.

Suspension removes the listing from the public site and signs the owners out
immediately; signing in again allows reading but not editing. Reinstating
republishes it. Rejection carries a reason the owner can read, and resubmission
clears it.

Role separation is asserted: a moderator can approve but cannot manage accounts
or delete a restaurant.

### Opening hours

Ordinary intervals; days with no configuration and days marked closed; split
days including the gap between periods; past-midnight closing on both the
starting day and the following morning; date-specific hours that override the
weekly pattern in both directions; and temporary closure overriding everything.

The UTC-to-Ashgabat conversion is asserted at a time of day where the date rolls
over, since that is where an off-by-one would hide.

### Migrations

Applying twice is a no-op. Every expected table exists. `price_minor` is an
integer column. Every foreign key referencing `stores` cascades on delete, so
deleting a restaurant cannot leave orphans.

## End-to-end verification

`scripts/smoke-test.sh` exercises a running deployment: it registers a
restaurant, fills it in, uploads photos, builds a menu, submits, confirms the
listing is not public while pending, approves it as an administrator, confirms
it publishes in all three languages, confirms the price survives as integer
tenge, confirms verification photos stay private, and deletes the test data.

This was run against the containerised production build and, separately, against
a deployment installed from the offline bundle on a machine with the application
image deleted locally first — which is the closest available simulation of the
target environment.

## Browser tests

The interface was verified by hand for most of the project, on the argument
quoted above: a rendering mistake is obvious. That argument turned out to be
wrong in one specific way, and the exception is worth stating because it is the
reason this section exists.

Some interface faults are not obvious at all. The map went blank in the built
application while every tile request returned 200 and the console logged
nothing — MapLibre's own stylesheet sets `position: relative` on the container,
which beat the `absolute` the layout depended on as soon as that stylesheet
began arriving in a separate chunk, and the element collapsed to no height.
Nothing failed. There was simply no map. A person has to look, and a person who
has looked at the same page fifty times stops seeing it.

So there are now twenty browser tests, run on a desktop and a phone viewport
against a real deployment. They cover what the server suite is structurally
unable to reach:

| Checked | Why it cannot be checked from the API |
| --- | --- |
| The map element has height and its tiles return 200 | A blank map and a working map make identical requests |
| The first page does not download MapLibre | Chunking is a property of the build, not of any response |
| Every lazily loaded area resolves | A missing chunk shows a spinner for ever and logs nothing |
| A card's photograph actually decoded | A broken image is present in the DOM and has a URL |
| The map panel has a real background colour | Tailwind silently emits nothing for an opacity modifier on a `var()` colour |
| Fullscreen fills the viewport and Escape leaves it | Geometry has no API representation |
| Changing language changes the restaurants, not just the chrome | The API returns the right thing; the question is whether the page asked for it |

They use the browser already installed on the machine rather than downloading
one, for the same reason the rest of the project avoids downloads.

## Defects found during verification

Recorded because they show what the process caught, not to pad the chapter.

| Defect | Found by |
| --- | --- |
| A malformed JSON body returned 500 instead of 400, and logged as an unhandled error | Smoke test |
| Store detail returned raw media rows with no URLs, so verification photos rendered broken in the admin panel | Smoke test |
| An unset optional environment variable arrives from Compose as an empty string, crash-looping any deployment that left the admin password blank | Deploying the container |
| A Compose profile's required variable broke the default stack, because interpolation happens for every service regardless of profile | Deploying the container |
| The deployment bundle checked for a file the asset pipeline no longer produces | Building the bundle |
| `formatPrice` emitted a thousands separator that `parsePrice` then rejected | Frontend unit test |
| Drizzle expanded an array parameter into a row constructor, so category assignment failed | Manual API exercise |
| `better-sqlite3` segfaulted opening the tile database inside the container | Running the container |
| The lockfile recorded only the build machine's native binaries, so the image could not be built on Linux at all | Building the image for release |
| `restore.sh` selected the uploads volume by substring match across the whole Docker host, then ran `rm -rf` in it — on a server with any second Compose project it could destroy an unrelated application's photos | Restore drill |
| Every shell script was committed non-executable, so the documented `scripts/restore.sh …` failed on a fresh clone | Restore drill |
| The map rendered nothing while every tile returned 200, after its stylesheet moved into a lazily loaded chunk | Browser test |
| Cross-building for amd64 failed on an arm64 machine: esbuild's install script runs the binary it has just written, which QEMU refuses with ETXTBSY | Building the release bundle |

The last one changed the design: rather than debug a native module, the runtime
dependency on SQLite was removed entirely, which also removed the compiler
requirement.

## Flakiness

Two sources of non-deterministic failure were found and fixed rather than
retried:

- Handing an Express app to supertest starts a fresh ephemeral server per
  request; with many requests in flight the reused sockets occasionally crossed
  and surfaced as a protocol parse error. One shared server for the suite.
- Vitest setup files run once per *test file*, so closing the database pool in
  `afterAll` tore it down while later files were still using it.

After both fixes the suite passed eight consecutive runs, and has since passed
sixteen more.

One further failure has been seen once — a category-count assertion in
`public.test.ts` receiving a 404 — and has not reproduced in the twenty-four
runs since, including six deliberate attempts to provoke it. It is recorded
here as unexplained rather than fixed, because a flake that stops appearing has
not been shown to be gone.

## Not covered

No load testing and no penetration testing have been done. Neither would be
hard to arrange and both would be the obvious next step before the platform
carries real traffic.

The browser tests run on Chrome only, at two viewport sizes. Safari and Firefox
are checked by hand. The tests also assume a seeded database: they assert that
restaurants and photographs are present, so they cannot be run against the
empty database a real deployment starts with.

The `linux/amd64` image is built and its architecture confirmed, but it has not
been run on x86 hardware — only cross-built under emulation on an arm64
machine. The restore drill, the smoke test and the browser suite were all run
against `linux/arm64`.
