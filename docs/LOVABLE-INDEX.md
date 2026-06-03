# Dental Lab — Documentação Lovable (índice)

Índice da documentação **bidirecional** com o [Lovable](https://lovable.dev): o que enviamos, o que a Lovable devolveu, e como integrar no monorepo.

**Produção:** https://dentallab.inovatitech.com.br  
**API:** https://dentallab.inovatitech.com.br/api

---

## Documentos

| Documento | Direção | Conteúdo |
|-----------|---------|----------|
| **[DOCUMENTACAO.md](./DOCUMENTACAO.md)** | **Lovable → Cursor** | Spec **completa do frontend exportado** (TanStack Start, rotas, API, odontograma 3D, RBAC) |
| **[LOVABLE-INTEGRACAO.md](./LOVABLE-INTEGRACAO.md)** | Integração | Mapa Lovable ↔ monorepo, gaps de API, plano de port |
| [LOVABLE-FRONTEND-HANDOFF.md](./LOVABLE-FRONTEND-HANDOFF.md) | Cursor → Lovable | Console supervisor, design system |
| [LOVABLE-AUTH-RBAC-HANDOFF.md](./LOVABLE-AUTH-RBAC-HANDOFF.md) | Cursor → Lovable | Login, esqueci senha, RBAC em Colaboradores |

---

## Resumo do export Lovable (`DOCUMENTACAO.md`)

- **Stack export:** TanStack Start v1, Tailwind v4, shadcn/ui, TanStack Query, Three.js (odontograma).
- **Stack monorepo:** React Router + Vite 6, CSS custom — ver [LOVABLE-INTEGRACAO.md](./LOVABLE-INTEGRACAO.md).
- **Novidade principal:** módulo **Odontograma 3D** (`/odontograma`) — ainda **sem API** no `apps/api`.
- **Alinhado:** auth, supervisor, fornecedores, grupos, design tokens (Outfit/DM Sans).

---

## Integração rápida (monorepo)

1. Leia [LOVABLE-INTEGRACAO.md](./LOVABLE-INTEGRACAO.md) (gaps e fases).
2. Porte componentes (odontograma) para `apps/web` **ou** mantenha app Lovable separado apontando para `/api`.
3. `VITE_DENTAL_LAB_API_URL=/api` no build web.
4. Deploy VPS:

```bash
cd /opt/dental-lab-system
bash infra/ops/redeploy-vps.sh
```

---

## Menu tenant (monorepo atual)

```
Cadastro: Empresa, Pacientes (/clientes), Colaboradores, Fornecedores
Laboratório: Próteses, Etiquetas, Status da Produção (/setores)
Dashboard (/)
```

Lovable adiciona: `/inicio`, `/odontograma`, `/sem-acesso` — ver mapa em LOVABLE-INTEGRACAO.

---

## Credenciais de teste (VPS)

| Usuário | Senha | Perfil |
|---------|-------|--------|
| supervisor | supervisor123 | Console MASTER |
| admin | admin123 | Tenant #1 |

`docs/POS-DEPLOY-VPS.md`

---

## Código de referência no monorepo

| Área | Caminho |
|------|---------|
| API cliente | `apps/web/src/api.ts` |
| API servidor | `apps/api/src/` |
| Auth / login | `apps/web/src/pages/Login.tsx`, `lib/auth.ts` |
| Supervisor | `apps/web/src/pages/Supervisor*.tsx` |
| Fornecedores | `apps/web/src/components/FornecedorForm.tsx` |
| RBAC UI | `lib/rbac-perfis.ts`, `components/auth/RbacPerfilPoliticas.tsx` |
