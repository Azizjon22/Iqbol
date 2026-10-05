#!/usr/bin/env bash
# Daily backup of the production stack: the database and every uploaded file.
# Run from the repository root on the server, e.g. from cron:
#   0 3 * * * cd /opt/iqbol && ./scripts/backup.sh >> backups/backup.log 2>&1
# Keeps the last KEEP_DAYS days (default 14). Copy the backups/ folder off the
# server as well (another machine, cloud storage) — a backup that lives only
# on the same disk does not survive that disk.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
DIR="${BACKUP_DIR:-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H-%M)"

mkdir -p "$DIR"

# Written to a temporary name first, so an interrupted run never leaves a
# half-written file that looks like a good backup.
$COMPOSE exec -T postgres pg_dump -U iqbol --clean --if-exists iqbol \
  | gzip > "$DIR/db_$STAMP.sql.gz.part"
mv "$DIR/db_$STAMP.sql.gz.part" "$DIR/db_$STAMP.sql.gz"

$COMPOSE exec -T api tar -czf - -C /app/apps/api uploads \
  > "$DIR/uploads_$STAMP.tar.gz.part"
mv "$DIR/uploads_$STAMP.tar.gz.part" "$DIR/uploads_$STAMP.tar.gz"

find "$DIR" -name 'db_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'uploads_*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date '+%F %T') backup ok: db_$STAMP.sql.gz ($(du -h "$DIR/db_$STAMP.sql.gz" | cut -f1)), uploads_$STAMP.tar.gz ($(du -h "$DIR/uploads_$STAMP.tar.gz" | cut -f1))"
