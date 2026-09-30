## Patch — docs/DEPLOY-VPS-PASSO-A-PASSO.md

### Incidente 2026-07 — dentallab offline (redirect loop)

**Causa:** sem vhost `dentallab.inovatitech.com.br` no **nginx do host**, o Host caía no server da Casa da Paz (`return 301 https://...`). Com Cloudflare **SSL Flexible**, isso gera loop infinito.

**Correção aplicada:** vhost host HTTP :80 → `127.0.0.1:9180` **sem** redirect HTTPS (mesmo padrão do Excellence).  
Arquivos: `infra/nginx/host/dentallab.inovatitech.com.br.conf` e `infra/nginx/host/install-dentallab-host-nginx.sh`.

```bash
sudo bash infra/nginx/host/install-dentallab-host-nginx.sh
curl -s -H "Host: dentallab.inovatitech.com.br" http://127.0.0.1/api/health
```

Cloudflare: SSL/TLS = **Flexible** enquanto a origem for só HTTP :80 neste vhost.
