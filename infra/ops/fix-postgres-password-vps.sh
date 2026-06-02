#!/usr/bin/env bash
# Alinha a senha do usuário Postgres ao valor de LAB_POSTGRES_PASSWORD no .env
# (necessário quando o .env foi alterado após o volume já existir).
#
# Uso:
#   cd /opt/dental-lab-system
#   bash infra/ops/fix-postgres-password-vps.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dental-lab-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERRO: .env não encontrado"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

POSTGRES_USER="${LAB_POSTGRES_USER:-dental_lab}"
POSTGRES_DB="${LAB_POSTGRES_DB:-dental_lab}"
NEW_PASS="${LAB_POSTGRES_PASSWORD:-}"

if [[ -z "$NEW_PASS" ]]; then
  echo "ERRO: LAB_POSTGRES_PASSWORD vazio no .env"
  exit 1
fi

echo "==> Alterando senha do usuário Postgres '$POSTGRES_USER' para coincidir com .env"
echo "    (conexão local dentro do container — não usa a senha antiga do .env)"

docker compose -f "$COMPOSE_FILE" --env-file .env exec -T lab-postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
  -c "ALTER USER ${POSTGRES_USER} WITH PASSWORD \$${NEW_PASS}\$\$;"

echo "==> Reiniciando lab-api"
docker compose -f "$COMPOSE_FILE" --env-file .env restart lab-api

echo "==> Aguardando health..."
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:9180/api/health" 2>/dev/null | python3 -m json.tool; then
    echo "==> OK"
    exit 0
  fi
  sleep 3
done

echo "Health ainda falhou — veja: docker compose -f $COMPOSE_FILE logs lab-api --tail 40"
exit 1
