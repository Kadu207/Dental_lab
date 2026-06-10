#!/usr/bin/env bash
# Limpeza SEGURA — somente Dental Lab (/opt/dental-lab-system).
# Dry-run por padrão. Para aplicar: APPLY=1 bash infra/ops/cleanup-disk-lab-vps.sh
set -euo pipefail

LAB_DIR="${LAB_DIR:-/opt/dental-lab-system}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-dental-lab-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_KEEP="${BACKUP_KEEP:-5}"
BACKUP_MIN_AGE_DAYS="${BACKUP_MIN_AGE_DAYS:-14}"
APPLY="${APPLY:-0}"

DRY() { echo "[dry-run] $*"; }
RUN() {
  if [[ "$APPLY" == "1" ]]; then
    echo "[aplicando] $*"
    eval "$@"
  else
    DRY "$@"
  fi
}

section() { echo ""; echo "========== $* =========="; }

[[ -d "$LAB_DIR" ]] || { echo "ERRO: $LAB_DIR não existe" >&2; exit 1; }
cd "$LAB_DIR"

if [[ "$APPLY" != "1" ]]; then
  echo "MODO DRY-RUN. Para aplicar: APPLY=1 bash $0"
fi

BACKUP_DIR="$LAB_DIR/backups/postgres"

section "1/3 — Backups Postgres vazios"
if [[ -d "$BACKUP_DIR" ]]; then
  while IFS= read -r -d '' f; do
    RUN "rm -f $(printf '%q' "$f")"
  done < <(find "$BACKUP_DIR" -type f -empty -print0 2>/dev/null)
fi

section "2/3 — Backups Postgres antigos (manter ${BACKUP_KEEP} mais recentes)"
if [[ -d "$BACKUP_DIR" ]]; then
  mapfile -t backups < <(
    find "$BACKUP_DIR" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | awk '{print $2}'
  )
  keep=0
  for f in "${backups[@]}"; do
    [[ -f "$f" ]] || continue
    keep=$((keep + 1))
    if [[ "$keep" -le "$BACKUP_KEEP" ]]; then
      continue
    fi
    age_days=$(( ( $(date +%s) - $(stat -c %Y "$f") ) / 86400 ))
    if [[ "$age_days" -ge "$BACKUP_MIN_AGE_DAYS" ]]; then
      RUN "rm -f $(printf '%q' "$f")"
    fi
  done
fi

section "3/3 — Docker (cache build + containers parados do projeto ${COMPOSE_PROJECT})"
RUN "docker builder prune -f"
mapfile -t stopped < <(
  docker ps -aq --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" --filter "status=exited" 2>/dev/null || true
)
for cid in "${stopped[@]}"; do
  [[ -n "$cid" ]] || continue
  RUN "docker rm $(printf '%q' "$cid")"
done

echo ""
if [[ "$APPLY" == "1" ]]; then
  echo "cleanup-disk-lab-vps: concluído."
else
  echo "cleanup-disk-lab-vps: dry-run. Rode audit antes: bash infra/ops/audit-disk-lab-vps.sh"
fi
