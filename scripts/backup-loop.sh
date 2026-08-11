#!/bin/sh
# Nightly backup sidecar: dumps the database and archives the uploads volume
# into /backups, then prunes anything older than RETENTION_DAYS.
#
# Deliberately a plain sleep loop rather than cron: the container has one job,
# and this keeps its logs in `docker compose logs backup` where an operator
# will actually look.
set -eu

RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_ROOT=/backups

run_backup() {
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  echo "[backup] starting $stamp"

  if pg_dump --format=custom --file="$BACKUP_ROOT/db-$stamp.dump"; then
    echo "[backup] database written: db-$stamp.dump"
  else
    echo "[backup] DATABASE DUMP FAILED" >&2
    return 1
  fi

  if tar -czf "$BACKUP_ROOT/uploads-$stamp.tar.gz" -C /data uploads; then
    echo "[backup] uploads written: uploads-$stamp.tar.gz"
  else
    echo "[backup] UPLOADS ARCHIVE FAILED" >&2
    return 1
  fi

  find "$BACKUP_ROOT" -maxdepth 1 -name 'db-*.dump' -mtime "+$RETENTION_DAYS" -delete
  find "$BACKUP_ROOT" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

  echo "[backup] done, keeping $RETENTION_DAYS days"
}

mkdir -p "$BACKUP_ROOT"

# One immediately on start, so a fresh deployment is never a day without a
# backup, then once every 24 hours.
while true; do
  run_backup || echo "[backup] run failed; will retry at the next interval" >&2
  sleep 86400
done
