#!/usr/bin/env bash
# Backup físico Postgres — stack produção VPS (docker-compose.prod.yml)
#
# Uso:
#   cd /opt/dental-lab-system
#   bash infra/ops/backup-postgres-vps.sh
#   OUT_DIR=/opt/dental-lab-system/backups/postgres bash infra/ops/backup-postgres-vps.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dental-lab-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
OUT_DIR="${OUT_DIR:-${APP_DIR}/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERRO: .env não encontrado em $APP_DIR"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

POSTGRES_USER="${LAB_POSTGRES_USER:-dental_lab}"
POSTGRES_DB="${LAB_POSTGRES_DB:-dental_lab}"

mkdir -p "$OUT_DIR"
TS="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/lab-pg-${TS}.sql.gz"

echo "==> Backup Postgres -> $OUT_FILE"
docker compose -f "$COMPOSE_FILE" --env-file .env exec -T lab-postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
  | gzip -9 > "$OUT_FILE"

if [[ ! -s "$OUT_FILE" ]]; then
  echo "ERRO: backup vazio"
  exit 1
fi

echo "==> OK ($(wc -c < "$OUT_FILE") bytes)"

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$OUT_DIR" -name 'lab-pg-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete -print 2>/dev/null || true
fi
