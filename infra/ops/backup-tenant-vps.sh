#!/usr/bin/env bash
# Backup lógico de um tenant Lab via API supervisor (JSON por clinica_id).
#
# Uso na VPS:
#   export DENTAL_LAB_SUPERVISOR_TOKEN="$(curl -s ... login ...)"   # ou JWT após login
#   ./infra/ops/backup-tenant-vps.sh 1
#   ./infra/ops/backup-tenant-vps.sh 1 /var/backups/dental-lab
#
# Variáveis:
#   LAB_API_BASE   — default http://127.0.0.1:9180/api
#   DENTAL_LAB_SUPERVISOR_TOKEN — Bearer JWT do perfil supervisor
#
set -euo pipefail

CLINICA_ID="${1:-}"
OUT_DIR="${2:-/var/backups/dental-lab}"
API_BASE="${LAB_API_BASE:-http://127.0.0.1:9180/api}"
TOKEN="${DENTAL_LAB_SUPERVISOR_TOKEN:-}"

if [[ -z "$CLINICA_ID" ]] || ! [[ "$CLINICA_ID" =~ ^[0-9]+$ ]]; then
  echo "Uso: $0 <clinica_id> [diretorio_saida]"
  exit 1
fi

if [[ -z "$TOKEN" ]]; then
  echo "Defina DENTAL_LAB_SUPERVISOR_TOKEN (JWT do login supervisor)."
  echo "Exemplo:"
  echo '  TOKEN=$(curl -s -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" \'
  echo '    -d "{\"usuario\":\"supervisor\",\"senha\":\"SUA_SENHA\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)[\"token\"])")'
  exit 1
fi

mkdir -p "$OUT_DIR"
TS="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/tenant-${CLINICA_ID}-${TS}.json"

echo "==> Exportando tenant #$CLINICA_ID -> $OUT_FILE"
curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinica-Id: 0" \
  "$API_BASE/supervisor/tenants/${CLINICA_ID}/backup/export" \
  -o "$OUT_FILE"

if [[ ! -s "$OUT_FILE" ]]; then
  echo "Arquivo vazio ou inexistente."
  exit 1
fi

echo "==> OK ($(wc -c < "$OUT_FILE") bytes)"
echo "Importar no mesmo tenant (substituir):"
echo "  curl -X POST -H \"Authorization: Bearer \$TOKEN\" -H \"Content-Type: application/json\" \\"
echo "    -d @<(jq -n --argjson b \"\$(cat $OUT_FILE)\" '{bundle:\$b,replace:true}') \\"
echo "    \"$API_BASE/supervisor/tenants/${CLINICA_ID}/backup/import\""
