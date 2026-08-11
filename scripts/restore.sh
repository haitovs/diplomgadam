#!/usr/bin/env bash
#
# Restores a backup produced by the backup sidecar.
#
#   scripts/restore.sh backups/db-20260811-020000.dump \
#                      backups/uploads-20260811-020000.tar.gz
#
# The uploads archive is optional. This overwrites live data, so it asks first.
set -euo pipefail

DB_DUMP="${1:-}"
UPLOADS_ARCHIVE="${2:-}"

if [[ -z "$DB_DUMP" ]]; then
  echo "Usage: $0 <db-dump> [uploads-archive]" >&2
  exit 1
fi

if [[ ! -f "$DB_DUMP" ]]; then
  echo "Database dump not found: $DB_DUMP" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
[[ -f .env ]] && set -a && . ./.env && set +a

POSTGRES_USER="${POSTGRES_USER:-tagam}"
POSTGRES_DB="${POSTGRES_DB:-tagam}"

echo "This will REPLACE the contents of database '$POSTGRES_DB'."
[[ -n "$UPLOADS_ARCHIVE" ]] && echo "It will also replace every uploaded image."
read -r -p "Type 'restore' to continue: " confirm
[[ "$confirm" == "restore" ]] || { echo "Aborted."; exit 1; }

echo "Stopping the application so nothing writes during the restore..."
docker compose stop app

echo "Restoring the database..."
docker compose exec -T postgres \
  pg_restore --clean --if-exists --no-owner \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$DB_DUMP"

if [[ -n "$UPLOADS_ARCHIVE" ]]; then
  if [[ ! -f "$UPLOADS_ARCHIVE" ]]; then
    echo "Uploads archive not found: $UPLOADS_ARCHIVE" >&2
    exit 1
  fi
  echo "Restoring uploads..."
  # Runs as a one-off container built from the app service, so Compose resolves
  # the uploads volume itself.
  #
  # This used to pick the volume with `docker volume ls --filter name=uploads`,
  # which matches by substring across the whole Docker host. On a machine
  # running any second Compose project the first match is not necessarily ours,
  # and the next line deletes everything in it — so the old version could wipe
  # an unrelated application's photos and restore ours into the wrong place.
  # Never name a volume by pattern in a command that begins with rm -rf.
  #
  # --no-deps keeps this from starting Postgres again behind our back.
  docker compose run --rm --no-deps --user root \
    -v "$(cd "$(dirname "$UPLOADS_ARCHIVE")" && pwd)":/restore:ro \
    --entrypoint sh app -c \
    "rm -rf /data/uploads/* /data/uploads/.[!.]* 2>/dev/null; \
     tar -xzf /restore/$(basename "$UPLOADS_ARCHIVE") -C /data && \
     chown -R node:node /data/uploads"
fi

echo "Starting the application..."
docker compose start app

echo "Restore complete."
