#!/usr/bin/env bash
# Instala cron diário para backup Postgres (03:15 UTC / VPS)
#
# Uso:
#   cd /opt/dental-lab-system
#   bash infra/ops/install-backup-cron-vps.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dental-lab-system}"
CRON_USER="${CRON_USER:-$(whoami)}"
CRON_HOUR="${CRON_HOUR:-3}"
CRON_MIN="${CRON_MIN:-15}"
OUT_DIR="${OUT_DIR:-${APP_DIR}/backups/postgres}"
LOG_FILE="${LOG_FILE:-${APP_DIR}/logs/backup-postgres.log}"

BACKUP_SCRIPT="$APP_DIR/infra/ops/backup-postgres-vps.sh"
MARKER="# dental-lab-postgres-backup"

if [[ ! -f "$BACKUP_SCRIPT" ]]; then
  echo "ERRO: $BACKUP_SCRIPT não encontrado"
  exit 1
fi

chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true
mkdir -p "$OUT_DIR" "$(dirname "$LOG_FILE")"

CRON_LINE="$CRON_MIN $CRON_HOUR * * * cd $APP_DIR && OUT_DIR=$OUT_DIR bash $BACKUP_SCRIPT >> $LOG_FILE 2>&1 $MARKER"

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v "$MARKER" > "$TMP" || true
echo "$CRON_LINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "==> Cron instalado para $CRON_USER:"
crontab -l | grep "$MARKER" || true
echo "==> Backups: $OUT_DIR"
echo "==> Log: $LOG_FILE"
echo "==> Teste manual: bash $BACKUP_SCRIPT"
