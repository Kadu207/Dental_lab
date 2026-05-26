#!/usr/bin/env bash
# Dental Lab — bootstrap VPS
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$APP_DIR"

if [[ ! -f docker-compose.prod.yml ]]; then
  echo "ERRO: projeto incompleto em $APP_DIR"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.production.example .env
  echo "Edite .env: nano .env"
  exit 0
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo "Aguardando stack..."
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:9180/api/health" >/dev/null 2>&1; then
    curl -s "http://127.0.0.1:9180/api/health"
    echo ""
    break
  fi
  sleep 3
done

NGINX="infra/nginx/dentallab.inovatitech.com.br.conf"
if [[ -f "$NGINX" ]]; then
  sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  sudo cp "$NGINX" /etc/nginx/sites-available/dentallab.inovatitech.com.br.conf
  sudo ln -sf /etc/nginx/sites-available/dentallab.inovatitech.com.br.conf /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Depois: sudo certbot --nginx -d dentallab.inovatitech.com.br"
fi

echo "OK — http://127.0.0.1:9180"
