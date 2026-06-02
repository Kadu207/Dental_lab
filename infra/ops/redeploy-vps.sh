#!/usr/bin/env bash
# Redeploy Dental Lab na VPS — corrige permissões root + alinha ao GitHub + rebuild.
#
# Uso (como gestaoti, uma vez com sudo para chown):
#   cd /opt/dental-lab-system
#   bash infra/ops/redeploy-vps.sh
#
# Variáveis:
#   APP_DIR          — default /opt/dental-lab-system
#   DEPLOY_USER      — dono dos arquivos após chown (default: usuário atual)
#   GIT_BRANCH       — default master
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dental-lab-system}"
DEPLOY_USER="${DEPLOY_USER:-$(whoami)}"
GIT_BRANCH="${GIT_BRANCH:-master}"
REPO_URL="${REPO_URL:-https://github.com/Kadu207/Dental_lab.git}"

echo "==> Dental Lab — redeploy VPS (${APP_DIR})"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "ERRO: $APP_DIR não é um repositório git."
  exit 1
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  BROKEN_ENV="$(ls -1 "${APP_DIR}".broken.*/.env 2>/dev/null | head -1 || true)"
  if [[ -n "$BROKEN_ENV" && -f "$BROKEN_ENV" ]]; then
    echo "==> Restaurando .env de ${BROKEN_ENV}"
    if [[ -r "$BROKEN_ENV" ]]; then
      cp "$BROKEN_ENV" "$APP_DIR/.env"
    else
      sudo cp "$BROKEN_ENV" "$APP_DIR/.env"
      sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR/.env"
    fi
  elif [[ -f /tmp/dental-lab.env.backup ]]; then
    echo "==> Restaurando .env de /tmp/dental-lab.env.backup (pode precisar sudo)"
    if [[ -r /tmp/dental-lab.env.backup ]]; then
      cp /tmp/dental-lab.env.backup "$APP_DIR/.env"
    else
      sudo cp /tmp/dental-lab.env.backup "$APP_DIR/.env"
      sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR/.env"
    fi
  else
    echo "ERRO: Crie $APP_DIR/.env (copie de .env.standalone.example ou da pasta .broken.*)"
    exit 1
  fi
fi

cd "$APP_DIR"

echo "==> Corrigindo dono dos arquivos (evita 'Permission denied' no git reset)"
if [[ "$(id -u)" -eq 0 ]]; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR"
else
  sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR"
fi

echo "==> Git: alinhar a origin/${GIT_BRANCH}"
git remote set-url origin "$REPO_URL"
git fetch origin
git reset --hard "origin/${GIT_BRANCH}"
git clean -fd

echo "==> Verificação rápida do checkout"
git rev-parse --short HEAD
test -f apps/api/src/db/schema-platform.sql
test -f apps/web/src/pages/SupervisorTenants.tsx

echo "==> Docker build + up"
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env up -d

echo "==> Health (aguarda API subir — até ~45s)"
HEALTH_URL="http://127.0.0.1:9180/api/health"
health_ok=false
for i in $(seq 1 15); do
  if curl -fsS "$HEALTH_URL" 2>/dev/null | python3 -m json.tool; then
    health_ok=true
    break
  fi
  echo "   tentativa $i/15 — API ainda não respondeu..."
  sleep 3
done

if [[ "$health_ok" != true ]]; then
  echo "Health falhou após 15 tentativas — veja:"
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs lab-api --tail 80
  exit 1
fi

echo "==> OK — commit $(git rev-parse --short HEAD) em produção"
echo "==> Opcional: bash infra/ops/install-backup-cron-vps.sh (backup Postgres diário)"
echo "==> Pós-deploy: docs/POS-DEPLOY-VPS.md (trocar senhas admin/supervisor)"
