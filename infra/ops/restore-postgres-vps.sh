#!/usr/bin/env bash
# Restore Postgres — produção VPS (USE APENAS EM TESTE ou emergência)
#
# Uso:
#   bash infra/ops/restore-postgres-vps.sh /var/backups/dental-lab/postgres/lab-pg-20260602-030001.sql.gz
#
set -euo pipefail

BACKUP_FILE="${1:-}"
APP_DIR="${APP_DIR:-/opt/dental-lab-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Uso: $0 <arquivo.sql.gz>"
  exit 1
fi

cd "$APP_DIR"
# shellcheck disable=SC1091
set -a
source .env
set +a

POSTGRES_USER="${LAB_POSTGRES_USER:-dental_lab}"
POSTGRES_DB="${LAB_POSTGRES_DB:-dental_lab}"

echo "ATENÇÃO: isto sobrescreve dados do banco $POSTGRES_DB."
read -r -p "Digite RESTAURAR para continuar: " confirm
if [[ "$confirm" != "RESTAURAR" ]]; then
  echo "Cancelado."
  exit 1
fi

echo "==> Restaurando $BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" --env-file .env exec -T lab-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
  docker compose -f "$COMPOSE_FILE" --env-file .env exec -T lab-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
fi

echo "==> Reinicie a API: docker compose -f $COMPOSE_FILE --env-file .env restart lab-api"
