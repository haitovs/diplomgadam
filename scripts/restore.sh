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

POSTGRES_USER="${POSTGRES_USER:-gadam}"
POSTGRES_DB="${POSTGRES_DB:-gadam}"

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
  # Runs inside a throwaway container so the volume can be written while the
  # app container is stopped.
  docker run --rm \
    -v "$(docker volume ls -q --filter name=uploads | head -1)":/data/uploads \
    -v "$(cd "$(dirname "$UPLOADS_ARCHIVE")" && pwd)":/restore:ro \
    alpine:3 sh -c "rm -rf /data/uploads/* && tar -xzf /restore/$(basename "$UPLOADS_ARCHIVE") -C /data --strip-components=0"
fi

echo "Starting the application..."
docker compose start app

echo "Restore complete."
