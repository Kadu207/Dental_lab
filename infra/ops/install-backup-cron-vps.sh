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
LOG_FILE="${LOG_FILE:-/var/log/dental-lab-backup.log}"

BACKUP_SCRIPT="$APP_DIR/infra/ops/backup-postgres-vps.sh"
MARKER="# dental-lab-postgres-backup"

if [[ ! -x "$BACKUP_SCRIPT" ]] && [[ ! -f "$BACKUP_SCRIPT" ]]; then
  echo "ERRO: $BACKUP_SCRIPT não encontrado"
  exit 1
fi

chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true

CRON_LINE="$CRON_MIN $CRON_HOUR * * * cd $APP_DIR && bash $BACKUP_SCRIPT >> $LOG_FILE 2>&1 $MARKER"

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v "$MARKER" > "$TMP" || true
echo "$CRON_LINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "==> Cron instalado para $CRON_USER:"
crontab -l | grep "$MARKER" || true
echo "==> Log: $LOG_FILE"
echo "==> Teste manual: bash $BACKUP_SCRIPT"
