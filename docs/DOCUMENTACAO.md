# Dental Lab — Suporte MASTER · Documentação Técnica Completa

> Documento de referência do **frontend exportado pela Lovable**, para integração no monorepo Cursor.
>
> **Integração no monorepo:** [LOVABLE-INTEGRACAO.md](./LOVABLE-INTEGRACAO.md) · **Índice:** [LOVABLE-INDEX.md](./LOVABLE-INDEX.md)
>
> **Monorepo alvo:** `dental-lab-system` — API em `apps/api`, web atual em `apps/web` (React Router + Vite, não TanStack Start).
> Stack: **TanStack Start v1 (React 19 + Vite 7)** · TypeScript estrito · Tailwind CSS v4 · shadcn/ui · TanStack Query · Three.js.
> Backend: **API Express externa** (multi-tenant) consumida por HTTP. Não há banco local neste frontend.

---

## 1. Visão geral

Painel administrativo de um **laboratório de prótese dentária (Dental Lab)** com dois grandes contextos de uso:

1. **Console MASTER (Supervisor / Inova):** provisionamento de clientes (tenants), geração de licenças, backup, importação de banco e troca de senha.
2. **Painel do Tenant (laboratório):** gestão de colaboradores, grupos/perfis, fornecedores e um **Odontograma 3D interativo** por paciente.

O frontend é **stateless quanto a dados**: toda persistência vem de uma **API Express** externa, autenticada por **JWT (Bearer)** e segmentada por tenant via header **`X-Clinica-Id`**.

### Conceitos centrais
- **Tenant / clínica:** identificado por `clinica_id` (numérico) e por um schema `lab_tN`.
- **Perfil (role):** define o que o usuário pode fazer (RBAC). Supervisor é global; demais perfis são por tenant.
- **Licença:** vínculo produto + período com status (active/trial/expired/revoked/cancelled/pending/none).
- **Código ED:** identificador comercial do cliente no formato `ED-YYYYMMDD-NNNN`.

---

## 2. Stack e dependências

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start v1 (SSR/SSG + server functions/routes) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (new-york), lucide-react |
| Roteamento | TanStack Router (file-based, `src/routes/`) |
| Data fetching | TanStack Query v5 + camada `fetch` própria (`apiClient.ts`) |
| Forms/validação | react-hook-form, @hookform/resolvers, zod |
| 3D | three, @react-three/fiber, @react-three/drei |
| PDF | jsPDF |
| Build | Vite 7 + `@lovable.dev/vite-tanstack-config`, target Edge (Cloudflare Workers via nitro) |
| Lint/format | ESLint 9 (typescript-eslint), Prettier |

Gerenciador de pacotes: **bun** (há `bun.lock` e `bunfig.toml`). Node também funciona.

### Scripts (`package.json`)
```bash
bun run dev        # vite dev (preview com HMR)
bun run build      # build de produção
bun run build:dev  # build em modo development
bun run preview    # serve o build
bun run lint       # eslint .
bun run format     # prettier --write .
```

---

## 3. Estrutura de pastas

```text
src/
├─ assets/                 login-bg.jpg
├─ components/
│  ├─ ui/                  shadcn/ui (button, card, table, dialog, select, ...)
│  ├─ odontograma/
│  │  └─ DentalArch3D.tsx  cena 3D da arcada (Three.js / R3F)
│  ├─ ActionButton.tsx     botão com ícone + variantes (primary/purple/ghost/danger)
│  ├─ EmpresaForm.tsx      formulário de cadastro/edição de tenant (máscaras + ViaCEP)
│  ├─ Modal.tsx            modal genérico
│  ├─ PageHeader.tsx       cabeçalho de página (ícone + título + subtítulo)
│  ├─ PasswordField.tsx    input de senha com mostrar/ocultar
│  ├─ PermissionGate.tsx   gate de RBAC por recurso/ação
│  ├─ RbacPerfilPoliticas.tsx  visualização das políticas por perfil
│  ├─ SidebarNavItem.tsx   item de navegação da sidebar
│  ├─ StatusBadge.tsx      badge de status de tenant/licença
│  ├─ SupervisorSidebar.tsx  menu do console MASTER
│  ├─ TableControls.tsx    busca + paginação + ordenação
│  └─ TenantSidebar.tsx    menu do painel do laboratório
├─ hooks/
│  ├─ use-mobile.tsx       breakpoint mobile
│  ├─ usePermissions.ts    RBAC central (GET /auth/me + can(resource, action))
│  └─ useTableControls.ts  estado de busca/paginação/ordenação
├─ lib/
│  ├─ api.ts               contrato de endpoints (api.supervisor.*, api.fornecedores.*, ...)
│  ├─ apiClient.ts         fetch wrapper (Bearer + X-Clinica-Id + 401 handling)
│  ├─ auth.ts              login/logout/sessão (localStorage) + reset de senha
│  ├─ auth-routes.ts       destino pós-login por perfil
│  ├─ config.ts            API_BASE + chaves de localStorage (cliente)
│  ├─ config.server.ts     config server-only (não vai pro browser)
│  ├─ inputMasks.ts        máscaras BR (CNPJ, CPF, CEP, telefone, UF)
│  ├─ licenseCatalog.ts    catálogo de produtos e períodos de licença
│  ├─ odontograma.ts       domínio FDI, condições, layout da arcada
│  ├─ odontogramaHistory.ts  histórico de versões por paciente (localStorage)
│  ├─ odontogramaPdf.ts    exportação PDF (jsPDF)
│  ├─ pagination.ts        ListParams/Paged + normalizeList (server ou client)
│  ├─ rbac-perfis.ts       catálogo de perfis + hierarquia de níveis
│  ├─ viacep.ts            lookup de CEP (ViaCEP)
│  ├─ utils.ts             cn() (clsx + tailwind-merge)
│  ├─ error-capture.ts / error-page.ts / lovable-error-reporting.ts  SSR error handling
│  └─ api/example.functions.ts  exemplo de createServerFn
├─ routes/                 roteamento file-based (ver seção 6)
├─ router.tsx              cria o router + QueryClient (SSR-safe)
├─ start.ts                createStart + middleware de erro
├─ server.ts               entrypoint SSR (wrapper de erro p/ Workers)
├─ styles.css              design tokens (Tailwind v4 @theme)
└─ routeTree.gen.ts        GERADO — não editar
```

---

## 4. Configuração e variáveis de ambiente

### Cliente (`src/lib/config.ts`)
```ts
API_BASE = import.meta.env.VITE_DENTAL_LAB_API_URL ?? "/api/proxy"
// Chaves de localStorage:
TOKEN_STORAGE_KEY          = "lab_token"
USER_STORAGE_KEY           = "lab_user"
CLINICA_STORAGE_KEY        = "lab_clinica_id"
PLATFORM_USER_STORAGE_KEY  = "lab_platform_user"
```

Resolução do `API_BASE`:
1. **`VITE_DENTAL_LAB_API_URL`** (build-time) — base explícita, ex. `http://localhost:3001/api` ou `/api` (mesma origem em produção).
2. **`/api/proxy`** (default no preview Lovable) — usa o **server route proxy** (`src/routes/api/proxy.$.ts`) que repassa para a VPS, evitando CORS no navegador.

### Servidor / runtime
- **`DENTAL_LAB_API_URL`** (secret) — base upstream usada pelo proxy. Ex.: `https://sua-vps.exemplo.com`. O proxy encaminha `/api/proxy/<path>` → `{DENTAL_LAB_API_URL}/api/<path>`.

### `.env` local (ver `.env.example`)
```bash
cp .env.example .env
# aponta o frontend direto para a API local (proxy é ignorado):
VITE_DENTAL_LAB_API_URL=http://localhost:3001/api
# Habilite CORS na API para a origem do dev server (ex.: http://localhost:5173)
```

> No Cursor/monorepo (mesma origem da API): defina `VITE_DENTAL_LAB_API_URL="/api"` e o proxy fica inativo.

---

## 5. Autenticação, sessão e RBAC

### 5.1 Fluxo de autenticação (`src/lib/auth.ts`)
- Sessão guardada no **`localStorage`** (não há cookie httpOnly neste frontend).
- `login(usuario, senha, clinicaId?)` → `POST {API_BASE}/auth/login`
  - Body: `{ usuario, senha, clinicaId? }`
  - Resposta: `{ token, nome, perfil, clinicaId, expiresInMinutes?, isPlatformUser? }`
  - Persiste `lab_token`, `lab_user` (`{nome, perfil}`), `lab_clinica_id`, `lab_platform_user`.
- Helpers: `getToken`, `getStoredUser`, `getPerfil`, `getClinicaId`, `setClinicaId`, `isPlatformUser`, `isAuthenticated`, `logout`.
- Recuperação de senha:
  - `solicitarReset(usuario, email, clinicaId?)` → `POST /auth/recuperar-senha/solicitar`
  - `redefinirSenha(token, novaSenha)` → `POST /auth/recuperar-senha/redefinir`
- Outros: `fetchMe()` → `GET /auth/me`; `fetchPerfis()` → `GET /auth/perfis`.

### 5.2 Cliente HTTP (`src/lib/apiClient.ts`)
- `apiFetch<T>(path, opts)` injeta:
  - `Authorization: Bearer <token>` (se houver),
  - `Content-Type: application/json`,
  - `X-Clinica-Id: <clinica_id>` (a menos que `noClinica: true`; pode ser sobreposto por `opts.clinicaId`).
- **401 → logout automático** + redireciona para `/login` e lança `ApiError`.
- `apiFetchRaw(path, opts)` para downloads binários (ex.: export de backup).
- `ApiError { message, status, body }`.

### 5.3 Gate de rota (`src/routes/_authenticated.tsx`)
- `beforeLoad` só roda no cliente (auth via localStorage): sem token → `redirect({ to: "/login" })`.
- Renderiza `SupervisorSidebar` se `perfil === "supervisor"`, senão `TenantSidebar`.
- Pós-login (`src/lib/auth-routes.ts`): supervisor → `/supervisor/cadastro`; demais → `/inicio`.

### 5.4 RBAC
**Perfis (`src/lib/rbac-perfis.ts`)** com hierarquia por `nivel`:

| Perfil | Label | Nível |
|---|---|---|
| supervisor | Supervisor (console MASTER, acesso total) | 70 |
| admin | Administrador (admin do tenant) | 60 |
| gestor | Gestor (operacional, sem admin) | 50 |
| recepcao | Recepção | 40 |
| colaborador | Colaborador | 40 |
| laboratorio | Laboratório | 30 |
| estagiario | Estagiário (somente leitura) | 10 |

- `manageablePerfis(perfil)` retorna perfis com nível estritamente menor (quem pode gerenciar quem).

**Hook central (`src/hooks/usePermissions.ts`)**
- Carrega `GET /auth/me` via TanStack Query (cache 5 min, `retry: false`).
- `can(resource, action)`:
  - `supervisor` → sempre `true`.
  - Se `me.permissoes` existe → checa `resource` (ou `*`) e `actions` (`read|write|delete`).
  - Fallback por perfil (`defaultCan`) enquanto `/auth/me` não resolve.

**Gate de UI (`src/components/PermissionGate.tsx`)**
- Envolve telas/botões: `<PermissionGate resource="fornecedores" action="read">...`.
- Sem permissão → bloqueia/redireciona (rota `/sem-acesso`).

---

## 6. Rotas (file-based)

> URL deriva do nome do arquivo. Segmentos com `_` são layouts (não aparecem na URL). `routeTree.gen.ts` é gerado automaticamente.

| Arquivo | URL | Descrição |
|---|---|---|
| `routes/index.tsx` | `/` | Redireciona conforme sessão/perfil |
| `routes/login.tsx` | `/login` | Login real (usuário + senha) |
| `routes/esqueci-senha.tsx` | `/esqueci-senha` | Solicitar reset de senha |
| `routes/redefinir-senha.tsx` | `/redefinir-senha` | Redefinir com token |
| `routes/_authenticated.tsx` | (layout) | Gate de auth + sidebars |
| `routes/_authenticated/inicio.tsx` | `/inicio` | Dashboard do tenant (atalhos por recurso) |
| `routes/_authenticated/colaboradores.tsx` | `/colaboradores` | CRUD de colaboradores (resource `colaboradores`) |
| `routes/_authenticated/grupos.tsx` | `/grupos` | Grupos & perfis (resource `grupos`) |
| `routes/_authenticated/fornecedores.tsx` | `/fornecedores` | CRUD de fornecedores (resource `fornecedores`) |
| `routes/_authenticated/odontograma.tsx` | `/odontograma` | Odontograma 3D (resource `odontograma`) |
| `routes/_authenticated/sem-acesso.tsx` | `/sem-acesso` | Tela de acesso negado |
| `routes/_authenticated/supervisor.cadastro.tsx` | `/supervisor/cadastro` | Cadastro de clientes (principal) |
| `routes/_authenticated/supervisor.tenants.tsx` | `/supervisor/tenants` | Gerador de licenças |
| `routes/_authenticated/supervisor.backup.tsx` | `/supervisor/backup` | Backup de empresas |
| `routes/_authenticated/supervisor.import.tsx` | `/supervisor/import` | Importação de banco |
| `routes/_authenticated/supervisor.conta.tsx` | `/supervisor/conta` | Troca de senha do supervisor |
| `routes/api/proxy.$.ts` | `/api/proxy/*` | Server route: proxy para a API upstream |

Cada rota define `head()` com `title` próprio para SEO. As telas com dados usam `PermissionGate`.

---

## 7. Contrato da API (consumido pelo frontend)

Base efetiva = `API_BASE` (ver §4). Headers automáticos: `Authorization: Bearer`, `X-Clinica-Id` (exceto `noClinica`).

### 7.1 Auth (público / sessão)
| Método | Rota | Uso |
|---|---|---|
| POST | `/auth/login` | `{ usuario, senha, clinicaId? }` → token + perfil + clinicaId |
| GET | `/auth/me` | `{ sub, perfil, clinicaId, permissoes[] }` |
| GET | `/auth/perfis` | lista pública de perfis |
| POST | `/auth/recuperar-senha/solicitar` | `{ usuario, email, clinicaId? }` |
| POST | `/auth/recuperar-senha/redefinir` | `{ token, novaSenha }` |

### 7.2 Supervisor (`/supervisor/*`, sempre `noClinica`)
**Tenants**
- `GET /supervisor/tenants/overview` — lista com status de licença.
- `GET /supervisor/tenants` · `GET /supervisor/tenants/:clinicaId`
- `POST /supervisor/tenants` · `PUT /supervisor/tenants/:clinicaId` · `DELETE /supervisor/tenants/:clinicaId`
- `POST /supervisor/tenants/bulk-status` — `{ clinicaIds[], status: "active"|"suspended" }`

**Licenças**
- `GET /supervisor/licencas`
- `POST /supervisor/tenants/:clinicaId/licencas/gerar` — `{ produto, periodo, cliente?, clinica_id?, cliente_codigo?, observacoes? }`
- `PUT /supervisor/licencas/:clinicaId/:id`
- `POST /supervisor/licencas/:clinicaId/:id/cancelar` · `.../revogar`

**Backup / Importação**
- `GET /supervisor/backups`
- `GET /supervisor/tenants/:clinicaId/backup/export` (raw download)
- `POST /supervisor/tenants/:clinicaId/backup/import`
- `POST /supervisor/backup/import` (novo tenant)

**Conta**
- `POST /supervisor/conta/senha` — `{ senhaAtual, novaSenha }`

### 7.3 Tenant-scoped (header `X-Clinica-Id`)
Listas aceitam `?page&limit&sort&order&search` e retornam **array puro** ou **envelope paginado** (`normalizeList` trata ambos).

| Recurso | Endpoints |
|---|---|
| Fornecedores | `GET /fornecedores` · `POST /fornecedores` · `PUT /fornecedores/:id` · `DELETE /fornecedores/:id` |
| Colaboradores | `GET /colaboradores` · `POST` · `PUT /:id` · `DELETE /:id` |
| Grupos | `GET /grupos` · `POST` · `PUT /:id` · `DELETE /:id` |
| Pacientes | `GET /pacientes` (referência p/ odontograma) |
| Odontograma | `GET /odontograma/:pacienteId` · `PUT /odontograma/:pacienteId` (`{ dentes }`) |

### 7.4 Principais tipos (resumo de `src/lib/api.ts`)
- `TenantRecord` / `TenantOverview` (razão social, fantasia, CNPJ/CPF, endereço completo, contatos, responsável, redes, status; overview adiciona `license_status`, `license_days_remaining`, `license_produto`, `license_periodo`).
- `TenantLicenseRow` (`chave`, `cliente`, `produto`, `periodo`, `status`, `expires_at`...).
- `Fornecedor` / `FornecedorInput`.
- `Colaborador` / `ColaboradorInput` (com `senha?` no create/troca).
- `Grupo` / `GrupoInput`.
- `Permissao { resource, actions[] }`, `MeResponse`.
- `PacienteRef`, `OdontogramaRecord { paciente_id, dentes: ToothState[], updated_at? }`.

---

## 8. Módulo Odontograma 3D

### Domínio (`src/lib/odontograma.ts`)
- **Numeração FDI**: arcada superior `18..11 | 21..28`, inferior `48..41 | 31..38`.
- **Tipos de dente**: `incisivo | canino | premolar | molar` (`toothType(fdi)`).
- **Condições** (`ToothConditionId`): `sadio, carie, restauracao, coroa, canal, implante, protese, extracao, ausente` — cada uma com cor hex e label (`CONDITIONS` / `CONDITION_MAP`).
- `buildArch()` gera o layout elíptico (posição, rotação, tamanho) para a cena 3D.
- `ToothState` = estado clínico por dente (condição + nota).

### Cena 3D (`src/components/odontograma/DentalArch3D.tsx`)
- `@react-three/fiber` + `@react-three/drei` (`OrbitControls`, `RoundedBox`, `Html`, `ContactShadows`).
- Anatomia: cúspides em molares/pré-molares, borda incisal em incisivos, raízes (molares com 2 raízes).
- Interação: clique seleciona o dente, hover mostra tooltip, rotação automática quando ocioso, zoom/rotação por OrbitControls.
- `gl={{ preserveDrawingBuffer: true }}` permite `toDataURL()` para o PDF; `onCanvasReady` expõe o canvas ao pai.
- Carregado via `React.lazy` na rota para evitar erro no SSR.

### Histórico (`src/lib/odontogramaHistory.ts`)
- Snapshots **locais por paciente** (`localStorage`, chave `odontograma:history:<id>`), máx. 40 versões.
- `getHistory`, `pushVersion`, `clearHistory`, `formatVersionDate`. Permite visualizar e restaurar versões anteriores.

### Exportação PDF (`src/lib/odontogramaPdf.ts`)
- `exportOdontogramaPdf({ pacienteNome, pacienteId, imageDataUrl, states, savedAt })` com jsPDF (A4): banner roxo, snapshot 3D, legenda colorida das condições e lista de dentes marcados com data de salvamento/emissão.

### Tela (`src/routes/_authenticated/odontograma.tsx`)
- Seletor de paciente, painel de ferramentas (marcar condição), resumo clínico.
- Abas: visualização 3D e **"Lista de dentes"** (edição rápida de condição + nota sem ir ao 3D).
- Botões de imprimir/exportar PDF e histórico de versões. Protegida por `PermissionGate resource="odontograma"`.

---

## 9. Design system (`src/styles.css`)

Tailwind v4 via `@theme inline` mapeando CSS vars (hex) para utilitários.

- **Fontes**: `--font-display: Outfit` (títulos), `--font-sans: DM Sans` (corpo).
- **Raio**: `--radius: 0.75rem` (sm/md/lg/xl/2xl derivados).
- **Tokens semânticos** (não use cores cruas nos componentes):

| Token | Valor | Uso |
|---|---|---|
| background / foreground | `#f0f2f8` / `#0f172a` | fundo / texto |
| card / popover | `#ffffff` | superfícies |
| primary | `#0f172a` | ações primárias |
| secondary / muted / accent | `#eef1f7` / `#f1f5f9` / `#eef2ff` | neutros |
| destructive / danger | `#dc2626` | erros/remoção |
| ring | `#6366f1` | foco |
| sidebar / sidebar-active | `#0c0f1a` / `#6366f1` | menu escuro |
| purple (+soft) | `#7c3aed` / `#ede9fe` | "Gerar licença" |
| success (+soft) | `#059669` / `#d1fae5` | status ativo |
| warning (+soft) | `#d97706` / `#fef3c7` | trial/alerta |

- Sidebar escura fixa ~260px (desktop) com top bar mobile.
- Componentes base próprios: `PageHeader`, `ActionButton` (variantes primary/purple/ghost/danger), `SidebarNavItem`, `StatusBadge`, `Modal`, `PasswordField`.

---

## 10. Utilitários

- **`inputMasks.ts`**: máscaras BR — CNPJ, CPF, CEP, telefone/WhatsApp, UF.
- **`viacep.ts`**: lookup `https://viacep.com.br/ws/{cep}/json/` preenchendo endereço.
- **`licenseCatalog.ts`**: produtos (Excellence Dental Cloud | Cloud + Lab | Dental Lab standalone) e períodos (Teste 7/30 dias, 1/2/4/5 anos).
- **`pagination.ts`**: `buildListQuery`, `normalizeList` (paginação server **ou** client transparente), tipos `ListParams`/`Paged`/`SortOrder`.
- **`useTableControls.ts`**: estado de busca/paginação/ordenação para tabelas.
- **`utils.ts`**: `cn()` (clsx + tailwind-merge).

---

## 11. SSR / Servidor (TanStack Start)

- **`src/router.tsx`**: `getRouter()` cria `QueryClient` **por request** (SSR-safe) + `createRouter({ defaultPreloadStaleTime: 0 })`.
- **`src/start.ts`**: `createStart` com `errorMiddleware` (captura throws e renderiza página de erro 500).
- **`src/server.ts`**: entrypoint SSR para Workers; normaliza erros "engolidos" pelo h3 e renderiza `renderErrorPage()`.
- **`src/routes/__root.tsx`**: shell HTML, `QueryClientProvider`, `NotFoundComponent` (404) e `ErrorComponent` (com `router.invalidate()` + `reset()`), reporte de erro via `lovable-error-reporting`.
- **`vite.config.ts`**: usa `@lovable.dev/vite-tanstack-config` (target Edge/Cloudflare). Server entry redirecionado para `src/server.ts`.
- **Proxy** (`routes/api/proxy.$.ts`): server route que repassa GET/POST/PUT/DELETE/PATCH para `DENTAL_LAB_API_URL`, removendo headers hop-by-hop; retorna 502 se o secret não estiver definido.

> Runtime é Cloudflare Workers (edge): evite libs Node-only em server functions/SSR. `process.env` deve ser lido **dentro** de handlers (bind por request).

---

## 12. Como rodar localmente

```bash
# 1. Dependências
bun install            # ou: npm install

# 2. Ambiente (frontend → API local)
cp .env.example .env
# edite VITE_DENTAL_LAB_API_URL=http://localhost:3001/api  (ajuste a porta)
# habilite CORS na API para a origem do dev server

# 3. Dev
bun run dev            # http://localhost:5173 (ou porta exibida)

# 4. Build/preview
bun run build && bun run preview
```

Credenciais de teste sugeridas (a confirmar com o backend): `supervisor` / `supervisor123`.

Para usar o **proxy** (sem mexer em CORS): não defina `VITE_DENTAL_LAB_API_URL` e configure o secret `DENTAL_LAB_API_URL` com a URL da VPS.

---

## 13. Migração para o Cursor / monorepo

Ver plano detalhado em **[LOVABLE-INTEGRACAO.md](./LOVABLE-INTEGRACAO.md)**.

Resumo:

1. **Não** substituir `apps/web` pelo TanStack Start sem decisão explícita — portar **componentes** (odontograma, tabelas) é o caminho padrão.
2. **API_BASE** no monorepo: `VITE_DENTAL_LAB_API_URL=/api` (mesma origem; sem proxy `/api/proxy`).
3. Ajustar paths se necessário: Lovable usa `/colaboradores` e `/pacientes`; API hoje expõe `/usuarios` e `/clientes` (criar aliases ou adaptar `api.ts`).
4. Implementar **`/api/odontograma`** no backend antes de ativar a tela 3D em produção.
5. Headers inalterados: `Authorization: Bearer` + `X-Clinica-Id`.
6. Destinos no monorepo: `apps/web/src/pages/`, `components/`, `lib/` — manter `apps/web/src/api.ts` como cliente HTTP canônico.

---

## 14. Checklist de pendências conhecidas

- Definir o secret **`DENTAL_LAB_API_URL`** para o login real funcionar via proxy no preview.
- Confirmar credenciais de teste com o backend.
- Histórico do odontograma é **local (localStorage)** — se a API expuser versões, migrar para o servidor.
- Garantir CORS na API quando rodar frontend e backend em portas diferentes.

---

## 15. Convenções de código

- TypeScript **estrito**; criar o arquivo antes de importá-lo (build quebra com import não resolvido).
- Usar **tokens semânticos** do design system (nunca cores cruas em componentes).
- Ícones: `lucide-react`. UI base: `shadcn/ui` em `src/components/ui`.
- Data fetching: TanStack Query (loader `ensureQueryData` + `useSuspenseQuery`, ou `useQuery` em componentes); invalidar chaves após mutações.
- Não editar `src/routeTree.gen.ts`.
- Aliases: `@/*` → `src/*`.

---

_Documento gerado a partir da leitura integral do código-fonte do projeto._
