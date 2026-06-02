# Checklist de produção — Dental Lab System

Use este documento para validar deploy **standalone** ou **embedded**, com você no loop para itens físicos (impressora).

---

## 1. Testes automatizados (agente / CI)

### Standalone (stack Docker)

```bash
cd dental-lab-system
docker compose -f docker-compose.standalone.yml up -d --build
```

Aguarde ~30s e execute:

```powershell
pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180
```

**O script valida:** health, login, CRUD mínimo (cliente + prótese), alertas estoque, config lab, rota de impressão HTML.

### Embedded (Excellence + profile lab)

No repositório **Excellence_Dental**:

```powershell
$env:SMOKE_ADMIN_PASSWORD='sua-senha-admin'
pwsh ./infra/ops/smoke-lab-embedded.ps1 -BaseUrl http://127.0.0.1
```

### O que o agente pode fazer sozinho

- Subir compose, rodar smokes, corrigir falhas de API/CORS/auth/licença.  
- Revisar logs: `docker compose logs lab-api lab-web`.

### O que precisa da sua validação

- Impressão física na térmica (margens, legibilidade do Code128).  
- Fluxo real da equipe (recepção → lab → entrega).  
- Senhas e chaves em produção.

---

## 2. Segurança antes de ir ao ar

- [ ] Trocar senha do usuário `admin` (standalone) ou desativar após criar usuários reais  
- [ ] `DENTAL_LAB_JWT_SECRET` forte (32+ caracteres aleatórios)  
- [ ] `DENTAL_LAB_LICENSE_REQUIRED=true` + chave em vault (módulo licenciado)  
- [ ] `DENTAL_LAB_CORS_ORIGINS` com URL exata do front (sem lista vazia em ambiente exposto)  
- [ ] Não commitar `.env` com segredos  
- [ ] HTTPS no reverse proxy (Nginx / Caddy na VPS)  
- [ ] Remover `VITE_DENTAL_LAB_LICENSE_KEY` do build de produção (licença só no servidor)

---

## 3. Backup do banco

### Automatizar backup (Windows)

```powershell
# Backup manual + retenção 7 dias
pwsh ./infra/ops/backup-standalone.ps1

# Agendar diário (Task Scheduler): ação
#   pwsh -File "C:\...\dental-lab-system\infra\ops\backup-standalone.ps1"
```

Restore de teste: `pwsh ./infra/ops/restore-standalone.ps1 -BackupFile .\backups\lab-....sql`

### Impressão de calibração (sem prótese real)

```powershell
pwsh ./infra/ops/print-test.ps1 -BaseUrl http://127.0.0.1:9180
```

Ou na UI: **Configuração → Imprimir etiqueta de teste (3 vias)**.

### Automatizar (cron na VPS)

```bash
cd /opt/dental-lab-system
bash infra/ops/backup-postgres-vps.sh          # teste manual
bash infra/ops/install-backup-cron-vps.sh      # diário 03:15
```

Arquivos em `/var/backups/dental-lab/postgres/` (retenção 14 dias). Ver [docs/POS-DEPLOY-VPS.md](./docs/POS-DEPLOY-VPS.md).

### Backup manual (bash)
docker compose -f docker-compose.standalone.yml exec -T lab-postgres \
  pg_dump -U dental_lab dental_lab > backup-lab-$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f docker-compose.standalone.yml exec -T lab-postgres \
  psql -U dental_lab dental_lab
```

**Automatizar (cron na VPS):** agendar `pg_dump` diário + retenção 7/30 dias (rsync ou object storage).

### Embedded

Backup do **mesmo** volume Postgres do Excellence — inclui schema `dental_lab`.

### SQLite (somente dev)

Arquivo em `apps/api/data/*.db` — copiar com app parado.

---

## 4. Permissões e usuários

| Hoje | Meta |
|------|------|
| Login standalone `admin` / `admin123` (seed) | UI para criar/editar `lab_usuarios` |
| Perfil string no JWT (`admin`, etc.) | RBAC por rota (recepção vs lab vs gestão) |
| Embedded usa perfil do ERP | Mapear roles ERP → permissões no menu lab |

Até a UI existir: criar usuários via SQL em `dental_lab.lab_usuarios` (hash bcrypt).

---

## 5. Impressora térmica — recomendações

Guia completo: **[IMPRESSORA-ETIQUETAS.md](./IMPRESSORA-ETIQUETAS.md)**

**Modelo recomendado:** **Zebra ZD230** (203 dpi, 4"), versão USB+Ethernet `ZD23042-30AC00EZ`, bobina **100×50 mm** térmica direta.

O layout oficial é **100 mm × 50 mm**, Code128, 3 vias (uma página por via no navegador). Layout calibrado em `packages/labels` (maio/2026).

### Fluxo de impressão no sistema

1. Configurar empresa em **Etiquetas / Empresa** (logo PNG/JPG).  
2. Registrar prótese → **Imprimir 3 vias** (abre HTML).  
3. No diálogo do navegador: impressora térmica, escala 100%, sem margens extras.  
4. Escanear com leitor USB (emula teclado + Enter) em **Leitor Código de Barras**.

### Validação com você (checklist físico)

- [ ] Código legível no leitor (mesmo valor `PROT-...`)  
- [ ] Logo legível (não pixelizado)  
- [ ] Texto sem corte nas bordas  
- [ ] Três vias distinguíveis (faixa de cor no topo)  
- [ ] Cola/adorno da bobina 100×50 correta na impressora  

Se a impressora for menor, altere temporariamente para `termica_50x30` na URL de impressão ou implemente o seletor na UI (Fase 3 pendente).

---

## 6. Pós-deploy

- [ ] Smoke standalone ou embedded verde  
- [ ] Backup testado (restore em ambiente de teste)  
- [ ] Equipe treinada (cadastro → etiqueta → scanner → status)  
- [ ] `ETAPAS-DO-PROJETO.md` revisado após cada release  

---

## 7. Deploy VPS (dentallab.inovatitech.com.br)

### Pré-requisitos

- VPS Ubuntu/Debian com Docker
- DNS na Cloudflare: `dentallab` → IP da VPS (proxy laranja)
- Gerador de Licenças em `https://licencas.inovatitech.com.br` (porta interna **8195**)
- `PRODUCT_API_KEY` do Gerador = `DENTAL_LAB_LICENSE_SERVER_API_KEY` no Dental Lab

### Passos

```bash
sudo mkdir -p /opt/dental-lab-system
cd /opt/dental-lab-system
cp .env.production.example .env
# editar senhas, JWT, API key do gerador

bash infra/ops/deploy-vps.sh
# ou: docker compose -f docker-compose.prod.yml --env-file .env up -d --build

sudo cp infra/nginx/dentallab.inovatitech.com.br.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/dentallab.inovatitech.com.br.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d dentallab.inovatitech.com.br
sudo nginx -t && sudo systemctl reload nginx
```

### Cloudflare

- SSL/TLS: **Full (strict)**
- Cache Rule: bypass em `/api/*`
- Always Use HTTPS: ativado

### Validar

```bash
curl -s https://dentallab.inovatitech.com.br/api/health
# licencaRemota: true, licencaServidorUrl: https://licencas.inovatitech.com.br
```

### Gerador de Licenças (projeto separado)

Repositório `Gerador de Licenças` → `/opt/gerador-licencas`:

```bash
cp .env.production.example .env
docker compose up -d --build
# nginx: infra/nginx/licencas.inovatitech.com.br.conf → certbot
curl -s https://licencas.inovatitech.com.br/health
```

**Não use a porta 8090** — ela pertence a outro projeto. O Gerador usa **8195** localmente.

---

## Contato agente ↔ você

Quando rodar os smokes, envie ao agente:

1. Saída completa do script (pass/fail).  
2. URL base usada.  
3. Para impressora: foto de uma etiqueta impressa + modelo da impressora.

O agente ajusta CSS `@page` em `packages/labels` com base no feedback.
