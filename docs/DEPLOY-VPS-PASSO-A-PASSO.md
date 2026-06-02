# Deploy VPS — Dental Lab (passo a passo completo)

Servidor: **128.140.77.31**  
Lab: **https://dentallab.inovatitech.com.br** (porta host **9180**)  
Gerador: **https://licencas.inovatitech.com.br** (porta host **8195**)

---

## PARTE E — Diagnóstico (o que você deve ter visto)

### E.1 — `docker compose ps`

**Comando (na VPS):**
```bash
cd /opt/dental-lab-system
docker compose -f docker-compose.prod.yml ps
```

| Coluna STATUS | Significado | Ação |
|---------------|-------------|------|
| `Up (healthy)` em `lab-postgres` | Postgres OK | Seguir |
| `Up` em `lab-api` e `lab-web` | Stack OK | Seguir para E.2 |
| `Restarting` em `lab-api` | Senha/JWT/env errado | Ver E.4 |
| `Exit` / ausente | Build falhou | `docker compose logs lab-api --tail 100` |

Porta esperada em `lab-web`:
```
0.0.0.0:9180->8080/tcp
```

### E.2 — Health (critério de sucesso Parte E)

**Comando:**
```bash
curl -s http://127.0.0.1:9180/api/health | python3 -m json.tool
```

**Resposta OK (todos estes campos):**
```json
{
  "ok": true,
  "licencaRemota": true,
  "licencaServidorUrl": "https://licencas.inovatitech.com.br",
  "trialDias": 30
}
```

| Campo | Se estiver errado | Correção |
|-------|-------------------|----------|
| `ok: false` ou connection refused | `lab-web` ou `lab-api` down | `docker compose logs lab-api --tail 80` |
| `licencaRemota: false` | API key ou URL vazia | Editar `/opt/dental-lab-system/.env`: `DENTAL_LAB_LICENSE_SERVER_URL` + `DENTAL_LAB_LICENSE_SERVER_API_KEY` (= `PRODUCT_API_KEY` do Gerador) → `docker compose ... up -d` |
| HTML em vez de JSON | URL errada | Use `/api/health`, não só `/` |

### E.3 — UI local

```bash
curl -sI http://127.0.0.1:9180/ | head -5
```

Esperado: `HTTP/1.1 200 OK`

Browser (se firewall liberar): `http://128.140.77.31:9180` → login `admin` / `admin123`

### E.4 — Erros comuns e correção

**`password authentication failed for user "dental_lab"`**
```bash
cd /opt/dental-lab-system
docker compose -f docker-compose.prod.yml down
docker volume ls | grep lab_postgres
docker volume rm dental-lab-system_lab_postgres_data   # nome exato do ls
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

> **Nota:** `--no-cache` é flag do `build`, não do `up`. Rebuild com cache: `up -d --build`.

**Deploy inicial (clone do GitHub):**
```bash
git clone https://github.com/Kadu207/Dental_lab.git /opt/dental-lab-system
cd /opt/dental-lab-system
cp .env.standalone.example .env   # editar senhas e JWT
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

**Atualizar código na VPS (após push no GitHub):**

O remote `dental_lab` existe só na sua máquina de desenvolvimento. Na VPS use `origin`.

**Importante:** se algum comando Docker foi executado com `sudo`, arquivos em `/opt/dental-lab-system` podem pertencer a `root`. Nesse caso `git reset` falha com `Permission denied`. Corrija o dono **antes** do git:

```bash
cd /opt/dental-lab-system
sudo chown -R "$(whoami):$(whoami)" /opt/dental-lab-system
git remote set-url origin https://github.com/Kadu207/Dental_lab.git
git fetch origin
git reset --hard origin/master
git clean -fd
```

Script automatizado (recomendado):

```bash
cd /opt/dental-lab-system
bash infra/ops/redeploy-vps.sh
```

Se o repositório estiver muito corrompido após um reset parcial, reclone preservando o `.env`:

```bash
# Backup do .env (sudo cria arquivo root — copie com sudo também)
sudo cp /opt/dental-lab-system/.env /tmp/dental-lab.env.backup
sudo mv /opt/dental-lab-system /opt/dental-lab-system.broken.$(date +%Y%m%d)

sudo git clone https://github.com/Kadu207/Dental_lab.git /opt/dental-lab-system
sudo chown -R "$(whoami):$(whoami)" /opt/dental-lab-system

# Restaurar .env (obrigatório sudo se o backup foi feito com sudo)
sudo cp /tmp/dental-lab.env.backup /opt/dental-lab-system/.env
sudo chown "$(whoami):$(whoami)" /opt/dental-lab-system/.env
# Alternativa se ainda existir a pasta quebrada:
# sudo cp /opt/dental-lab-system.broken.*/.env /opt/dental-lab-system/.env
# sudo chown "$(whoami):$(whoami)" /opt/dental-lab-system/.env

cd /opt/dental-lab-system
bash infra/ops/redeploy-vps.sh
```

Build e health após checkout OK:

```bash
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env up -d
sleep 8
curl -s http://127.0.0.1:9180/api/health | python3 -m json.tool
```

> **Atenção:** não rode `git clean -fd` se `git reset --hard` falhou — isso apaga arquivos novos e deixa o tree inconsistente. Sempre `chown` primeiro.

> **Atenção:** `git reset --hard` apaga alterações locais no diretório do app. O `.env` não é versionado e permanece intacto.

**Se `curl /api/health` retornar vazio ou erro JSON:**

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs lab-api --tail 80
curl -sv http://127.0.0.1:9180/api/health 2>&1 | head -30
```

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| `unable to unlink ... Permission denied` | Arquivos owned by root | `sudo chown -R $(whoami):$(whoami) /opt/dental-lab-system` → reset de novo |
| Build TS: `Cannot find module SupervisorTenants` | Reset parcial + `git clean` | `chown` + `git reset --hard origin/master` ou reclone |
| `Expecting value: line 1 column 1` | `lab-api` reiniciando ou pull não aplicado | reset completo + rebuild; ver logs |
| `Connection refused` | `lab-web` down | `docker compose ... up -d` |
| HTML em vez de JSON | URL errada | Use `/api/health` |
| `502 Bad Gateway` | API não responde na porta 3333 | Logs `lab-api`; conferir `schema-platform.sql` no image (commit recente) |

Ou use o script: `bash infra/ops/deploy-vps.sh` (faz pull + rebuild quando não há conflito).

**Backup lógico por tenant (supervisor):**

- UI: `/supervisor/tenants` → selecionar tenant → Exportar / Importar JSON
- CLI na VPS: `bash infra/ops/backup-tenant-vps.sh <clinica_id>` (requer `DENTAL_LAB_SUPERVISOR_TOKEN`)

**`Defina DENTAL_LAB_JWT_SECRET` / `DENTAL_LAB_LICENSE_SERVER_API_KEY`**
```bash
openssl rand -hex 32   # JWT
grep PRODUCT_API_KEY /opt/gerador-licencas/.env
nano /opt/dental-lab-system/.env
```

---

## PARTE F — Nginx do Excellence (proxy dentallab)

> **Não use** `/etc/nginx/sites-available/` — porta 80 já é do container nginx do Excellence.

### F.1 — Caminhos

| O quê | Caminho na VPS |
|-------|-----------------|
| Repo Excellence | `/opt/excellence/repo` |
| Config dentallab | `/opt/excellence/repo/infra/nginx/dentallab.inovatitech.com.br.conf` |
| Config licencas (referência) | `/opt/excellence/repo/infra/nginx/licencas.inovatitech.com.br.conf` |
| Compose Excellence | `/opt/excellence/repo/docker-compose.prod.yml` |

### F.2 — Verificar/copiar config dentallab

**Se o arquivo não existir no Excellence**, copie do Dental Lab:
```bash
cp /opt/dental-lab-system/infra/nginx/dentallab.inovatitech.com.br.conf \
   /opt/excellence/repo/infra/nginx/dentallab.inovatitech.com.br.conf
```

**Conteúdo obrigatório** (upstream `host.docker.internal:9180`, não `127.0.0.1`):
```bash
cat /opt/excellence/repo/infra/nginx/dentallab.inovatitech.com.br.conf
```

### F.3 — Montar volume no docker-compose do Excellence

**Editar:** `/opt/excellence/repo/docker-compose.prod.yml`  
**Seção `nginx` → deve conter:**

```yaml
  nginx:
    image: nginx:1.27-alpine
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "80:80"
    volumes:
      - ./infra/nginx/snippets/gzip.conf:/etc/nginx/snippets/gzip.conf:ro
      - ./infra/nginx/default.conf:/etc/nginx/conf.d/00-excellencedental.conf:ro
      - ./infra/nginx/licencas.inovatitech.com.br.conf:/etc/nginx/conf.d/10-licencas.inovatitech.com.br.conf:ro
      - ./infra/nginx/dentallab.inovatitech.com.br.conf:/etc/nginx/conf.d/20-dentallab.inovatitech.com.br.conf:ro
```

**Se faltar a linha `20-dentallab...`**, adicione com `nano` e salve.

**Aplicar compose (sem duplicar stack):**
```bash
cd /opt/excellence/repo
docker compose -f docker-compose.prod.yml up -d nginx
```

### F.4 — Nome do container nginx e restart

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep nginx
```

Exemplo: `excellence_dental_prod-nginx-1`

```bash
docker restart excellence_dental_prod-nginx-1
```
(Substitua pelo nome real.)

### F.5 — Validar config dentro do container

```bash
NGINX=$(docker ps --format '{{.Names}}' | grep nginx | head -1)
docker exec "$NGINX" nginx -t
docker exec "$NGINX" cat /etc/nginx/conf.d/20-dentallab.inovatitech.com.br.conf
```

Esperado: `syntax is ok` + upstream `host.docker.internal:9180`.

### F.6 — Teste proxy na VPS (Parte F OK)

```bash
curl -s -H "Host: dentallab.inovatitech.com.br" http://127.0.0.1/api/health | python3 -m json.tool
```

Deve retornar o **mesmo JSON** da Parte E.2.

Se **502 Bad Gateway**:
1. `curl http://127.0.0.1:9180/api/health` — Lab precisa estar Up
2. `docker exec "$NGINX" getent hosts host.docker.internal` — deve resolver IP
3. Reiniciar nginx: `docker restart "$NGINX"`

---

## PARTE G — Cloudflare

**Onde:** https://dash.cloudflare.com → domínio **inovatitech.com.br**

### G.1 — DNS

| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| A | `dentallab` | `128.140.77.31` | Proxied (laranja) |

### G.2 — SSL/TLS (origem ainda HTTP:80)

**Caminho:** SSL/TLS → Overview → **Flexible**

(Depois de certificado na origem, mudar para Full strict.)

### G.3 — Always Use HTTPS

SSL/TLS → Edge Certificates → **Always Use HTTPS: On**

### G.4 — Bypass cache na API

Rules → Cache Rules → Create:

- **If:** URI Path contains `/api/`
- **Then:** Cache eligibility → Bypass cache

### G.5 — Teste público (seu PC)

```powershell
curl -s https://dentallab.inovatitech.com.br/api/health
```

| Código | Significado | Ação |
|--------|-------------|------|
| JSON com `"ok":true` | Go-live OK | Parte H |
| 502 | Proxy/nginx/Lab | Repetir F.6 |
| 521 | Origem offline | `docker ps` na VPS |
| 525/526 | SSL mismatch | Cloudflare → Flexible |

---

## PARTE H — Checklist final

```bash
# 1 Gerador
curl -s http://127.0.0.1:8195/health

# 2 Lab direto
curl -s http://127.0.0.1:9180/api/health

# 3 Lab via nginx Excellence
curl -s -H "Host: dentallab.inovatitech.com.br" http://127.0.0.1/api/health

# 4 Público (opcional na VPS)
curl -s https://dentallab.inovatitech.com.br/api/health
```

**Browser:**
1. https://dentallab.inovatitech.com.br
2. Login → Empresa → trial/licença
3. Trocar senha do `admin`

---

## Ordem resumida (F → H)

```bash
# F — Nginx Excellence
cp /opt/dental-lab-system/infra/nginx/dentallab.inovatitech.com.br.conf \
   /opt/excellence/repo/infra/nginx/   # se necessário
nano /opt/excellence/repo/docker-compose.prod.yml   # volume 20-dentallab...
cd /opt/excellence/repo && docker compose -f docker-compose.prod.yml up -d nginx
docker ps | grep nginx
docker restart <NOME_NGINX>
curl -s -H "Host: dentallab.inovatitech.com.br" http://127.0.0.1/api/health

# G — Cloudflare (painel): DNS + Flexible + bypass /api/

# H — curl https://dentallab.inovatitech.com.br/api/health
```
