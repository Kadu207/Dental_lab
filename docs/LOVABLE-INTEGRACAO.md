# Integração — export Lovable → monorepo `dental-lab-system`

Este documento complementa **[DOCUMENTACAO.md](./DOCUMENTACAO.md)** (especificação do frontend gerado na Lovable) com o **estado real** do monorepo e o plano de incorporação.

---

## 1. Dois frontends, uma API

| Aspecto | Lovable (`DOCUMENTACAO.md`) | Monorepo atual (`apps/web`) |
|---------|----------------------------|-----------------------------|
| Framework | TanStack Start v1 + file routes | React 19 + React Router 7 + Vite 6 |
| Estilo | Tailwind v4 + shadcn/ui | CSS custom (`index.css`) + componentes UI próprios |
| Deploy Lovable | Cloudflare Workers + proxy `/api/proxy` | Docker nginx + API Express na mesma origem |
| API | `apiClient.ts` + `api.ts` | `apps/web/src/api.ts` + `lib/auth.ts` |

**Regra:** a API Express em `apps/api` é a fonte da verdade. O export Lovable **não substitui** a API; adapta-se a ela.

---

## 2. Mapa de rotas

| URL Lovable | Rota monorepo atual | Status |
|-------------|-------------------|--------|
| `/login` | `/login` | OK |
| `/esqueci-senha` | `/esqueci-senha` | OK |
| `/redefinir-senha` | `/redefinir-senha` | OK |
| `/supervisor/cadastro` | `/supervisor/cadastro` | OK |
| `/supervisor/tenants` | `/supervisor/tenants` | OK |
| `/supervisor/backup` | `/supervisor/backup` | OK |
| `/supervisor/import` | `/supervisor/import` | OK |
| `/supervisor/conta` | `/supervisor/conta` | OK |
| `/inicio` | `/` (Dashboard) | Renomear ou alias |
| `/colaboradores` | `/colaboradores` | OK (API: ver §3) |
| `/grupos` | `/grupos` | OK |
| `/fornecedores` | `/fornecedores` | OK (`FornecedorForm` 3 seções) |
| `/odontograma` | — | **Novo** (UI Lovable; API a criar) |
| `/sem-acesso` | — | Opcional (403 inline hoje) |
| Empresa, Pacientes, Próteses, Etiquetas | `/empresa`, `/clientes`, `/proteses`, `/etiquetas` | OK (menu monorepo) |

---

## 3. Endpoints — alinhamento API

### Já existem no `apps/api`

| Lovable chama | Monorepo expõe | Notas |
|---------------|----------------|-------|
| `POST /auth/login` `{ usuario, senha }` | Igual | OK |
| `GET /auth/me`, `/auth/perfis` | Igual | OK |
| Recuperação senha | `/auth/recuperar-senha/*` | SMTP na VPS |
| `/supervisor/*` | `apps/api/src/routes/supervisor/` | OK |
| `/fornecedores` | `routes/fornecedores.ts` | OK |
| `/grupos` | `routes/grupos.ts` | OK |

### Divergências (adaptar no port ou na API)

| Lovable | Monorepo hoje | Ação recomendada |
|---------|---------------|------------------|
| `GET /colaboradores` | `GET /api/usuarios` | Alias `/colaboradores` → mesmo router **ou** mudar `api.ts` Lovable para `/usuarios` |
| `GET /pacientes` | `GET /api/clientes` | Alias `/pacientes` **ou** manter `/clientes` no port |
| `GET /odontograma/:pacienteId` | Não existe | Implementar rota + tabela `odontograma` (Postgres) |
| Listas `?page&limit&search` | Listas simples (sem paginação server) | Estender routers com query params **ou** paginar no client (Lovable já suporta) |

### RBAC — recurso `odontograma`

O Lovable usa `PermissionGate resource="odontograma"`. No monorepo, adicionar política em `apps/api/src/auth/rbac.ts` (ex.: gestor/admin `read/write`, estagiario `read`) quando a API existir.

---

## 4. O que portar do export Lovable (prioridade)

### Fase A — sem mudar framework (recomendado)

Copiar **lógica e UI** para `apps/web`, mantendo React Router:

| Origem Lovable (`src/`) | Destino monorepo |
|-------------------------|------------------|
| `lib/odontograma.ts` | `apps/web/src/lib/odontograma.ts` |
| `lib/odontogramaHistory.ts` | `apps/web/src/lib/odontogramaHistory.ts` |
| `lib/odontogramaPdf.ts` | `apps/web/src/lib/odontogramaPdf.ts` |
| `components/odontograma/DentalArch3D.tsx` | `apps/web/src/components/odontograma/` |
| `components/TableControls.tsx` | `apps/web/src/components/` (opcional) |
| `hooks/useTableControls.ts` | `apps/web/src/hooks/` (opcional) |
| `lib/pagination.ts` | `apps/web/src/lib/` (client-side fallback) |

Dependências novas no `apps/web/package.json`:

- `three`, `@react-three/fiber`, `@react-three/drei`, `jspdf` (odontograma + PDF)

### Fase B — API odontograma

1. Migration Postgres: tabela `odontograma (clinica_id, paciente_id, dentes JSONB, updated_at)`.
2. Rotas `GET/PUT /api/odontograma/:pacienteId` (paciente = `clientes.id`).
3. RBAC `odontograma` em `rbac.ts`.
4. Página `apps/web/src/pages/Odontograma.tsx` + rota em `App.tsx`.

### Fase C — substituir stack (opcional, grande)

Migrar `apps/web` inteiro para TanStack Start conforme `DOCUMENTACAO.md` — só se quiser SSR/Workers; custo alto vs. Docker atual.

---

## 5. Configuração no monorepo (não usar proxy Lovable)

No deploy VPS / monorepo:

```env
# apps/web build (vite)
VITE_DENTAL_LAB_API_URL=/api
```

Não é necessário `DENTAL_LAB_API_URL` proxy nem `/api/proxy` — nginx serve web + API na mesma origem.

---

## 6. Checklist de integração

- [ ] Ler [DOCUMENTACAO.md](./DOCUMENTACAO.md) completo
- [ ] Decidir Fase A (port parcial) vs. Fase C (stack nova)
- [ ] Aliases API: `/colaboradores`, `/pacientes` (se o código Lovable for colado sem alterar paths)
- [ ] Implementar API + tela odontograma (se for requisito de produto)
- [ ] `npm run build` no monorepo
- [ ] `cd /opt/dental-lab-system && bash infra/ops/redeploy-vps.sh`

---

## 7. Documentos relacionados

| Arquivo | Direção |
|---------|---------|
| [DOCUMENTACAO.md](./DOCUMENTACAO.md) | Spec **retorno** Lovable (TanStack Start) |
| [LOVABLE-INDEX.md](./LOVABLE-INDEX.md) | Índice handoff |
| [LOVABLE-FRONTEND-HANDOFF.md](./LOVABLE-FRONTEND-HANDOFF.md) | Spec enviada **para** Lovable (supervisor) |
| [LOVABLE-AUTH-RBAC-HANDOFF.md](./LOVABLE-AUTH-RBAC-HANDOFF.md) | Spec auth enviada **para** Lovable |

---

*Atualizado após inclusão de `docs/DOCUMENTACAO.md` no repositório.*
