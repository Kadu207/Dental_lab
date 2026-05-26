#!/usr/bin/env bash
# Deploy Dental Lab na VPS (Ubuntu/Debian)
# Pré-requisitos: Docker, nginx, certbot, DNS dentallab.inovatitech.com.br
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dental-lab-system}"

echo "==> Dental Lab — deploy VPS"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Crie $APP_DIR/.env a partir de .env.production.example"
  exit 1
fi

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo "==> Health local (via nginx interno do container)"
sleep 5
curl -fsS "http://127.0.0.1:9180/api/health" | head -c 800
echo ""

if [[ -f "$APP_DIR/infra/nginx/dentallab.inovatitech.com.br.conf" ]]; then
  echo "==> Nginx (primeira vez na VPS):"
  echo "  sudo cp infra/nginx/dentallab.inovatitech.com.br.conf /etc/nginx/sites-available/"
  echo "  sudo ln -sf /etc/nginx/sites-available/dentallab.inovatitech.com.br.conf /etc/nginx/sites-enabled/"
  echo "  sudo certbot --nginx -d dentallab.inovatitech.com.br"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
fi

echo "==> Cloudflare: SSL/TLS = Full (strict); cache bypass em /api/*"
echo "==> Pós-deploy: troque senha admin (admin/admin123) e configure licença em Empresa"
echo "==> URL: https://dentallab.inovatitech.com.br"
