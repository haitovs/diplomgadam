# Deployment

The platform ships as a self-contained bundle: three Docker images plus the
compose file and configuration. The target machine needs Docker and Docker
Compose and nothing else. No package downloads, no registry access, no CDN.

## 1. Build the bundle

On a machine with internet access and the map source available:

```bash
scripts/prepare-map-assets.sh          # once; populates data/maps
scripts/bundle.sh --tag v1.0.0
```

By default this builds for `linux/amd64`, which is what most servers run. On
Apple Silicon targeting an ARM server, pass `--platform linux/arm64`.

The result is `dist-bundle/tagam-v1.0.0.tar.gz`, roughly 290 MB. It contains:

```
images.tar            app, postgres:16-alpine, caddy:2-alpine
docker-compose.yml
deploy/Caddyfile
scripts/              backup-loop.sh, restore.sh
.env.example
INSTALL.md
```

## 2. Install on the server

```bash
tar -xzf tagam-v1.0.0.tar.gz
cd tagam-v1.0.0

docker load -i images.tar

cp .env.example .env
$EDITOR .env
```

At minimum set:

| Variable | Why |
| --- | --- |
| `POSTGRES_PASSWORD` | Database password. Generate one: `openssl rand -base64 24` |
| `PUBLIC_ORIGIN` | The URL the site is reached at. Must be `https://` for session cookies to carry the `Secure` flag |

Then:

```bash
docker compose up -d
```

The database schema is created automatically. The site is on port 4080.

### The first administrator

A random password is generated on first start and printed **once**:

```bash
docker compose logs app | grep -A4 "FIRST RUN"
```

Sign in at `/admin/login` and change it — the panel refuses every other action
until you do.

To choose the password yourself instead, set `BOOTSTRAP_ADMIN_PASSWORD` in
`.env` before the first start. Leave it blank afterwards.

## 3. HTTPS

```bash
docker compose --profile caddy up -d
```

Caddy obtains and renews a certificate automatically. Two prerequisites:

- `SITE_ADDRESS` in `.env` is a domain whose DNS points at this machine.
- The machine can reach Let's Encrypt.

Set `APP_BIND=127.0.0.1` so the application is not also reachable directly on
port 4080.

### Where automatic certificates are not possible

This is the expected situation on hosting with no outbound access. Edit
`deploy/Caddyfile` — the comments at the top show both alternatives — and
restart Caddy. Nothing else in the stack changes.

**With your own certificate**, mount the files into the Caddy service and
replace the site block:

```
{$SITE_ADDRESS} {
	tls /etc/caddy/cert.pem /etc/caddy/key.pem
	reverse_proxy app:4080
}
```

```yaml
# in docker-compose.yml, under caddy:
volumes:
  - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
  - ./deploy/cert.pem:/etc/caddy/cert.pem:ro
  - ./deploy/key.pem:/etc/caddy/key.pem:ro
```

**Behind someone else's proxy**, skip the Caddy profile entirely, leave the app
on port 4080, and terminate TLS upstream. Keep `TRUST_PROXY=true` so client
addresses are read from the forwarded headers — login rate limiting depends on
seeing the real address.

## 4. Satellite imagery (optional)

The offline bundle contains vector tiles only. Satellite imagery is raster
photography that is neither shipped nor ours to redistribute, so a satellite
layer can only come from an outside tile service.

It is therefore off unless a deployment asks for it. Set `SATELLITE_TILE_URL`
in `.env` to a raster tile template and the control appears on the map; leave it
blank and the map never requests anything beyond this server, which is the right
choice on hosting with no outbound access.

When it is set, that single host is added to the content security policy rather
than the policy being relaxed. Check the terms of use of whichever service you
point at — most imagery providers restrict caching and redistribution.

## 5. Backups

```bash
docker compose --profile backup up -d
```

A sidecar runs immediately and then every 24 hours, writing into the host
directory named by `BACKUP_DIR` (`./backups` by default):

- `db-<timestamp>.dump` — a `pg_dump` custom-format dump
- `uploads-<timestamp>.tar.gz` — every uploaded photo

Anything older than `BACKUP_RETENTION_DAYS` (14 by default) is removed.

Everything stays on your machine; nothing is sent anywhere.

> The backup directory is not itself backed up. Copy it off the server
> periodically — a backup on the same disk does not survive that disk failing.

### Restoring

```bash
scripts/restore.sh backups/db-20260811-020000.dump \
                   backups/uploads-20260811-020000.tar.gz
```

This stops the application, replaces the database contents and the uploads
volume, and starts it again. It asks for confirmation first, because it
overwrites live data. The uploads archive is optional.

Check a restore works **before** you need it. Restore into a scratch deployment
and sign in.

### Test the restore before you need it

Do this once, on the day you deploy, and then whenever the stack changes. A
backup nobody has restored from is a guess.

Restoring into the live deployment to check it works is not a test, it is the
disaster. Bring up a second, throwaway stack instead:

```bash
mkdir /tmp/restore-drill && cd /tmp/restore-drill
cp -r /path/to/tagam/{docker-compose.yml,deploy,scripts} .
cp /path/to/tagam/.env .            # then change APP_PORT to a free one
docker compose -p drill up -d
echo restore | COMPOSE_PROJECT_NAME=drill ./scripts/restore.sh \
    /path/to/backups/db-YYYYMMDD-HHMMSS.dump \
    /path/to/backups/uploads-YYYYMMDD-HHMMSS.tar.gz
```

Then open it and check that the restaurants are there and their photos load —
not merely that the script printed "Restore complete". Tear it down with
`docker compose -p drill down -v` when you are satisfied.

## 6. Upgrading

Build a new bundle, copy it over, then:

```bash
docker load -i images.tar
docker compose up -d
```

Migrations run automatically at startup and are safe to re-run; a version with
no schema changes simply starts.

Take a backup first. Roll back by loading the previous image and setting
`APP_IMAGE` in `.env` back to that tag — but note that a rollback across a
migration that changed the schema needs a database restore too.

## Configuration reference

| Variable | Default | Meaning |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | — | Required. Database password |
| `PUBLIC_ORIGIN` | — | Public URL; `https://` enables `Secure` cookies |
| `POSTGRES_USER` / `POSTGRES_DB` | `tagam` | Database credentials |
| `APP_IMAGE` | `tagam-restaurant:latest` | Image tag compose runs |
| `APP_BIND` / `APP_PORT` | `0.0.0.0` / `4080` | Where the app is published |
| `TRUST_PROXY` | `true` | Read client IPs from proxy headers |
| `SITE_ADDRESS` | `localhost` | Domain Caddy requests a certificate for |
| `SESSION_TTL_DAYS` | `30` | How long a sign-in lasts |
| `MAX_UPLOAD_MB` | `8` | Largest accepted image |
| `MAX_GALLERY_IMAGES` | `12` | Gallery photos per restaurant |
| `MIN_VENUE_PROOF_IMAGES` | `2` | Verification photos required to submit |
| `LOGIN_MAX_ATTEMPTS` | `8` | Failures before a temporary lockout |
| `SATELLITE_TILE_URL` | — | Raster tiles for the optional satellite layer; blank disables it |
| `LOGIN_LOCKOUT_MINUTES` | `15` | How long that lockout lasts |
| `BOOTSTRAP_ADMIN_USERNAME` | `admin` | First administrator's username |
| `BOOTSTRAP_ADMIN_PASSWORD` | — | Blank generates a random one, printed once |
| `BACKUP_DIR` | `./backups` | Where backups are written |
| `BACKUP_RETENTION_DAYS` | `14` | How many days of backups to keep |

An empty value is treated as unset, which is how Compose renders an optional
variable you have not filled in.

## Verifying a deployment

```bash
scripts/smoke-test.sh https://your-domain admin 'your-admin-password'
```

This registers a restaurant, fills it in, submits it, approves it, confirms it
publishes in all three languages, checks that verification photos stay private,
and deletes the test data. It creates real records, so run it against a test
deployment rather than a busy production one.

For a quick check instead:

```bash
curl -s https://your-domain/api/health
docker compose ps          # every service should be "healthy"
```

## Operational notes

**Storage.** Uploads live in the `uploads` volume. Each restaurant is capped at
one cover, 12 gallery photos, 10 verification photos and 500 dish photos, all
re-encoded to WebP and JPEG at two sizes. Budget roughly 10–20 MB per active
restaurant.

**Logs.** `docker compose logs -f app`. Sign-ins, approvals and listing edits are
also written to the audit log, visible in the admin panel.

**The database is not published to the host.** Only the application can reach
it. To inspect it: `docker compose exec postgres psql -U tagam -d tagam`.

**Sessions are server-side.** Suspending a store or resetting a password signs
the affected accounts out immediately rather than waiting for expiry.

## Troubleshooting

**The app container restarts repeatedly.** Read `docker compose logs app`. The
most common cause is a configuration error — the server validates its
environment at startup and names the offending variable rather than failing
later in an obscure way.

**The map is blank and `/maps/status` reports it is unavailable.** The tile
bundle was not baked into the image. Run `scripts/prepare-map-assets.sh` and
rebuild; `scripts/bundle.sh` refuses to build without it.

**Sign-in returns "too many failed attempts".** The lockout is working. It
clears after `LOGIN_LOCKOUT_MINUTES`, or an owner-role administrator can reset
the password.

**Photos 404 after a restore.** The uploads volume was not restored alongside
the database. Re-run `scripts/restore.sh` with both files.
