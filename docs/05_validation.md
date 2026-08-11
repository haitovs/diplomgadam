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
 ✓ src/test/migrations.test.ts       (4 tests)

 Test Files  7 passed (7)
      Tests  103 passed (103)
```

Plus 15 frontend unit tests covering money formatting and parsing.

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

After both fixes the full suite passed eight consecutive runs.

## Not covered

No load or penetration testing has been done. Browser coverage is manual, on
recent Chrome, Safari and Firefox. There are no automated end-to-end browser
tests; the smoke test exercises the API rather than the interface.

The offline bundle was verified on `linux/arm64`. The default build target is
`linux/amd64` and uses the same Dockerfile, but has not been run on real
hardware.
