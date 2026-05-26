# Integração — Módulo Dental Lab com Excellence Dental

Este repositório é um **produto separado** do Excellence Dental Cloud. Pode rodar **sozinho** (standalone) ou ser **integrado** ao ERP via licença (`LAB_MODULE_ENABLED` + `DENTAL_LAB_LICENSE_KEY` no Excellence e `docker-compose.lab-module.yml`). A separação é por implantação (URL, proxy, banco), não por desligar “metade” do código-fonte.

## Modelos de implantação

### A) Standalone (só o laboratório)

- API + **Postgres dedicado** (`docker-compose.standalone.yml`) ou SQLite em dev.
- Login próprio: `POST /api/auth/login` → usuários em `dental_lab.lab_usuarios` (padrão `admin` / `admin123`).
- Front: build estático servido atrás do mesmo domínio da API ou com `VITE_DENTAL_LAB_API_URL` apontando para a API.
- `DENTAL_LAB_LICENSE_REQUIRED=true` e `DENTAL_LAB_LICENSE_KEY` definidos no servidor da API.
- `DENTAL_LAB_CORS_ORIGINS` com a origem exata do front em produção.

### B) Embedded (aba “Laboratório” no Excellence Dental)

1. **UI** — rota `/dashboard/laboratorio` (iframe em `/lab/` ou `VITE_LAB_WEB_URL`).
2. **Auth** — mesmo JWT do ERP (`Authorization` + `X-Clinica-Id`); API valida na tabela `usuario` do Postgres do cliente.
3. **Licença** — proxy FastAPI `/lab-api/{path}` injeta `X-Dental-Lab-License`; Nginx expõe `/lab-api/` → backend.
4. **Banco (fase 2)** — schema `dental_lab` no **mesmo Postgres** do ERP; todas as tabelas com `clinica_id` (multi-tenant).

## Variáveis de ambiente (API)

Ver `apps/api/.env.example`. Principais:

| Variável | Função |
|----------|--------|
| `DENTAL_LAB_DEPLOYMENT_MODE` | `standalone` ou `embedded` (metadado em `/api/health`). |
| `DENTAL_LAB_LICENSE_REQUIRED` | `true` em produção típica do módulo licenciado. |
| `DENTAL_LAB_LICENSE_KEY` | Segredo compartilhado (ou base para token HMAC curto). |
| `DENTAL_LAB_CORS_ORIGINS` | Lista separada por vírgula; **obrigatório** definir em produção fechada. |
| `DENTAL_LAB_SQLITE_PATH` | Caminho opcional do arquivo `.db`. |

## Variáveis de ambiente (Front)

Ver `apps/web/.env.example`. Em builds Lovable/CI, defina `VITE_DENTAL_LAB_API_URL` para a URL pública da API (ou do prefixo `/lab-api` no mesmo domínio).

## Autenticação de usuário

| Modo | Login | Validação |
|------|-------|-----------|
| **standalone** | `POST /api/auth/login` (`admin` / `admin123` inicial) | JWT do lab (`DENTAL_LAB_JWT_SECRET`) + `lab_usuarios` |
| **embedded** | Login do Excellence | JWT do ERP (`DENTAL_LAB_ERP_JWT_SECRET` = `SECRET_KEY`) + tabela `usuario` |

Rotas públicas (sem Bearer): `GET /api/health`, `GET /api/license/status`, `GET /api/auth/status`, `POST /api/auth/login` (só standalone).

Demais rotas exigem `Authorization: Bearer` quando `DENTAL_LAB_AUTH_REQUIRED=true`, e opcionalmente `X-Dental-Lab-License` quando `DENTAL_LAB_LICENSE_REQUIRED=true`.

## Deploy Hetzner (automático)

Na VPS, após clone de `Excellence_Dental` e `dental-lab-system` como irmãos:

```bash
cd Excellence_Dental
cp .env.production.example .env.production   # preencher SECRET_KEY, DENTAL_LAB_LICENSE_KEY, etc.
docker compose -f docker-compose.prod.yml up -d --build
```

Rebuild **somente** o SPA + API do lab:

```powershell
pwsh ./infra/ops/deploy-lab-hetzner.ps1
# ou
bash ./infra/ops/deploy-lab-hetzner.sh
```

Validação embedded (login ERP → Postgres `dental_lab` → `/lab-api/` → SPA `/lab/`):

```powershell
$env:SMOKE_ADMIN_PASSWORD='senha-admin'
pwsh ./infra/ops/smoke-lab-embedded.ps1 -BaseUrl http://127.0.0.1
```

O serviço `lab-web` no compose builda `apps/web/Dockerfile` com `base=/lab/`; o nginx publica em `/lab/` e proxy `/lab-api/` para o BFF FastAPI.

## Checklist antes de Hetzner / produção

- [ ] `DENTAL_LAB_LICENSE_REQUIRED=true` e chave forte em vault.  
- [ ] `DENTAL_LAB_CORS_ORIGINS` preenchido (sem lista vazia em ambiente exposto).  
- [ ] Front com `VITE_DENTAL_LAB_API_URL` coerente com TLS e proxy.  
- [ ] Backup do SQLite ou volume Postgres.  
- [ ] (Embedded) proxy do ERP injeta licença; bundle do front sem chave.

## Dois produtos, duas implantações

| | **Dental Lab (standalone)** | **Módulo no Excellence (embedded)** |
|---|---------------------------|-------------------------------------|
| Repositório | `dental-lab-system` | ERP + build `lab-web` do mesmo monorepo lab |
| URL | Domínio/porta própria (`/`) | `/lab/` no host do ERP |
| Login | `POST /api/auth/login` (usuários lab) | JWT do ERP no `localStorage` |
| Menu | Sidebar completa do lab | **Um** item **Laboratório** no ERP; menu completo do lab **só dentro do iframe** |
| Cadastros nativos do ERP | — | Empresa, Financeiro, etc. **permanecem no ERP** (não duplicar como atalhos Lab no menu) |

Não unificar código nem substituir telas do ERP pelas do lab.

## Integração no Excellence (embedded)

O SPA do lab usa `BrowserRouter` com `basename` = `import.meta.env.BASE_URL` (ex.: `/lab` no build embedded).

| No ERP | Comportamento |
|--------|----------------|
| **Gestão → Laboratório** | Abre iframe em `/lab/proteses?embedded=1` (próteses / produção) |
| Demais cadastros do lab | Navegação pela **sidebar interna** do iframe (empresa, financeiro, estoque, …) |

Utilitários: `apps/web/src/lib/labPaths.ts`; `Excellence_Dental/frontend/src/lib/labModule.ts` (`LAB_DEFAULT_IFRAME_PATH`, `buildLabIframeSrc`).

**Standalone:** rotas na raiz (`/financeiro`, …) sem `embedded=1`; sidebar completa do Dental Lab.

## Lovable / zip no frontend

Após descompactar o zip no projeto web, preserve:

- `VITE_DENTAL_LAB_API_URL` e chamadas para `${origin}/api/...` alinhadas ao `api.ts` deste monorepo.  
- Rota `/laboratorio` ou mapeie a página principal do Lovable para esta rota no router do ERP.
