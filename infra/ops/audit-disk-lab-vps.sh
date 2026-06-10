#!/usr/bin/env bash
# Auditoria SOMENTE LEITURA — Dental Lab standalone (/opt/dental-lab-system).
# Não audita Excellence nem outros projetos na VPS.
#
# Uso:
#   cd /opt/dental-lab-system
#   bash infra/ops/audit-disk-lab-vps.sh
#
# Variáveis opcionais:
#   LAB_DIR=/opt/dental-lab-system
#   COMPOSE_PROJECT=dental-lab-system
#   COMPOSE_FILE=docker-compose.prod.yml
#   LAB_HEALTH_URL=http://127.0.0.1:9180/api/health
#   BACKUP_KEEP=5
#   BACKUP_MIN_AGE_DAYS=14
set -euo pipefail

LAB_DIR="${LAB_DIR:-/opt/dental-lab-system}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-dental-lab-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LAB_HEALTH_URL="${LAB_HEALTH_URL:-http://127.0.0.1:9180/api/health}"
BACKUP_KEEP="${BACKUP_KEEP:-5}"
BACKUP_MIN_AGE_DAYS="${BACKUP_MIN_AGE_DAYS:-14}"

section() { echo ""; echo "========== $* =========="; }
warn() { echo "AVISO: $*" >&2; }
note() { echo "  → $*"; }

[[ -d "$LAB_DIR" ]] || { warn "Pasta não encontrada: $LAB_DIR"; exit 1; }
cd "$LAB_DIR"

section "0/8 — Dental Lab (escopo desta auditoria)"
echo "LAB_DIR=$LAB_DIR"
echo "COMPOSE_PROJECT=$COMPOSE_PROJECT"
echo "COMPOSE_FILE=$COMPOSE_FILE"
git rev-parse --short HEAD 2>/dev/null || warn "sem git"
git remote get-url origin 2>/dev/null || true

section "1/8 — Disco (df)"
df -h "$LAB_DIR" 2>/dev/null || df -h /

section "2/8 — Tamanho em ${LAB_DIR}"
du -sh "$LAB_DIR"/* "$LAB_DIR"/.[!.]* 2>/dev/null | sort -h || du -sh "$LAB_DIR"/* 2>/dev/null | sort -h || true

section "3/8 — Git (status + dry-run clean)"
git status -sb 2>/dev/null || true
echo ""
echo "--- git clean -fdn (dry-run; NÃO executa) ---"
git clean -fdn 2>/dev/null || true
note "Revise untracked antes de git clean -fd."

section "4/8 — Configuração (.env — sem exibir secrets)"
if [[ -f .env ]]; then
  echo "  .env: presente ($(wc -c < .env | tr -d ' ') bytes)"
  for key in DENTAL_LAB_LICENSE_KEY DENTAL_LAB_LICENSE_SERVER_URL DENTAL_LAB_LICENSE_SERVER_API_KEY LAB_POSTGRES_PASSWORD DENTAL_LAB_JWT_SECRET; do
    if grep -qE "^${key}=.+$" .env 2>/dev/null; then
      echo "  $key: definido"
    else
      echo "  $key: AUSENTE ou vazio"
    fi
  done
else
  warn ".env ausente — copie de .env.standalone.example ou .env.production.example"
fi

section "5/8 — Backups Postgres locais (./backups/postgres)"
BACKUP_DIR="$LAB_DIR/backups/postgres"
if [[ -d "$BACKUP_DIR" ]]; then
  total="$(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"
  zero="$(find "$BACKUP_DIR" -type f -empty 2>/dev/null | wc -l | tr -d ' ')"
  echo "Arquivos: $total (zerados: $zero)"
  du -sh "$BACKUP_DIR"/* 2>/dev/null | sort -h || true
  if [[ "$zero" -gt 0 ]]; then
    echo ""
    echo "--- CANDIDATOS: backups vazios ---"
    find "$BACKUP_DIR" -type f -empty -printf '  %f\n' 2>/dev/null || true
  fi
  echo ""
  echo "--- CANDIDATOS: backups antigos (>${BACKUP_MIN_AGE_DAYS}d), manter ${BACKUP_KEEP} mais recentes ---"
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
    age_days=$(( ( $(date +%s) - $(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f") ) / 86400 ))
    if [[ "$age_days" -ge "$BACKUP_MIN_AGE_DAYS" ]]; then
      echo "  $(du -h "$f" | awk '{print $1}')  ${age_days}d  $(basename "$f")"
    fi
  done
else
  note "Pasta $BACKUP_DIR ausente (ok se backup só via cron externo)"
fi

section "6/8 — Docker stack Dental Lab"
if ! command -v docker >/dev/null 2>&1; then
  warn "docker não encontrado"
elif [[ ! -f "$COMPOSE_FILE" ]]; then
  warn "$COMPOSE_FILE não encontrado em $LAB_DIR"
else
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps 2>/dev/null || true
  echo ""
  echo "--- Containers parados deste projeto ---"
  stopped="$(docker ps -aq --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" --filter "status=exited" 2>/dev/null || true)"
  if [[ -z "$stopped" ]]; then
    echo "  (nenhum)"
  else
    echo "$stopped" | sed 's/^/  /'
  fi
  echo ""
  echo "--- Volumes deste projeto (NÃO apagar sem plano) ---"
  docker volume ls --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" 2>/dev/null \
    || docker volume ls 2>/dev/null | grep -i lab || true
  echo ""
  echo "--- Build cache / imagens (global; somente leitura) ---"
  docker system df 2>/dev/null || true
  note "Limpeza segura Lab: bash infra/ops/cleanup-disk-lab-vps.sh (dry-run)"
fi

section "7/8 — Health API Lab"
if command -v curl >/dev/null 2>&1; then
  if curl -fsS --max-time 10 "$LAB_HEALTH_URL" 2>/dev/null | python3 -m json.tool 2>/dev/null; then
    note "Health OK em $LAB_HEALTH_URL"
  else
    warn "Health falhou ou indisponível: $LAB_HEALTH_URL"
    note "Verifique: docker compose -p $COMPOSE_PROJECT -f $COMPOSE_FILE ps"
  fi
else
  warn "curl não encontrado"
fi

section "8/8 — Nunca apagar sem plano (Dental Lab)"
cat <<'EOF'
  • /opt/dental-lab-system/.env
  • Volume lab_postgres_data (Postgres produção)
  • Único backup recente funcional de cada tenant/clínica
  • Licença ativa (DENTAL_LAB_LICENSE_KEY + Gerador remoto se habilitado)
EOF

echo ""
echo "audit-disk-lab-vps: concluído (nenhum arquivo removido)."
