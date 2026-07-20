#!/usr/bin/env bash
# Instala/atualiza o vhost do nginx do HOST para dentallab → 127.0.0.1:9180
#
# Uso na VPS:
#   cd /opt/dental-lab-system
#   sudo bash infra/nginx/host/install-dentallab-host-nginx.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/dental-lab-system}"
SRC="${REPO_DIR}/infra/nginx/host/dentallab.inovatitech.com.br.conf"
DEST_AVAILABLE="${DEST_AVAILABLE:-/etc/nginx/sites-available/dentallab.inovatitech.com.br.conf}"
DEST_ENABLED="${DEST_ENABLED:-/etc/nginx/sites-enabled/dentallab.inovatitech.com.br.conf}"
APP_DOMAIN="${APP_DOMAIN:-dentallab.inovatitech.com.br}"
UPSTREAM_PORT="${UPSTREAM_PORT:-9180}"

log() { echo "==> $*"; }
fail() { echo "ERRO: $*" >&2; exit 1; }

[[ -f "$SRC" ]] || fail "arquivo ausente: $SRC"
[[ "$(id -u)" -eq 0 ]] || fail "rode com sudo"

log "Instalando vhost host: $DEST_AVAILABLE"
install -m 0644 "$SRC" "$DEST_AVAILABLE"
ln -sfn "$DEST_AVAILABLE" "$DEST_ENABLED"

log "nginx -t"
nginx -t

log "reload nginx"
if systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl reload nginx
else
  nginx -s reload
fi

log "Teste local Host: $APP_DOMAIN → :$UPSTREAM_PORT (via host :80)"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 \
  -H "Host: $APP_DOMAIN" "http://127.0.0.1/api/health" || echo 000)"
if [[ "$code" != "200" ]]; then
  log "AVISO: /api/health retornou HTTP $code"
  log "Confirme: curl -sS http://127.0.0.1:${UPSTREAM_PORT}/api/health"
  exit 1
fi

log "OK — host nginx proxy $APP_DOMAIN → 127.0.0.1:${UPSTREAM_PORT} (HTTP $code)"
log "Cloudflare: SSL/TLS = Flexible (origem HTTP :80, sem redirect neste vhost)"
