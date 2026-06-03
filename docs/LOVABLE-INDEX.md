# Dental Lab — Documentação Lovable (índice)

Use este índice para levar o frontend ao [Lovable](https://lovable.dev). A **API não muda** — só a UI.

**Produção:** https://dentallab.inovatitech.com.br  
**API:** `https://dentallab.inovatitech.com.br/api` (ou `/api` no mesmo host)

**Commits de referência:** `0cbb241` (fornecedores), `7429ca6` (RBAC/login), `493363c` (auth e-mail)

---

## Documentos (copiar para o Lovable)

| Documento | Conteúdo |
|-----------|----------|
| **[LOVABLE-FRONTEND-HANDOFF.md](./LOVABLE-FRONTEND-HANDOFF.md)** | Console **Supervisor** (cadastro clientes, licenças, backup, importação), design system, APIs `/api/supervisor/*`, prompt supervisor |
| **[LOVABLE-AUTH-RBAC-HANDOFF.md](./LOVABLE-AUTH-RBAC-HANDOFF.md)** | **Login**, esqueci senha, redefinir senha, RBAC em Colaboradores/Grupos, APIs `/api/auth/*`, prompt auth |

---

## Ordem sugerida no Lovable

1. **Auth** — login + recuperação de senha (`LOVABLE-AUTH-RBAC-HANDOFF.md` §8)
2. **Supervisor** — sidebar MASTER + cadastro + licenças (`LOVABLE-FRONTEND-HANDOFF.md` §10)
3. **Tenant** — menu Cadastro + Laboratório (prompt abaixo)

---

## Menu tenant (operador do laboratório)

```
Cadastro
  Empresa
  Pacientes          (rota /clientes)
  Colaboradores      (rota /colaboradores — RBAC aqui, não no login)
  Fornecedores       (rota /fornecedores)

Laboratório
  Próteses
  Etiquetas
  Status da Produção (rota /setores)

Dashboard            (rota /)
```

Menu filtrado por `GET /api/auth/me` → `permissoes[]` (resource + read/write/delete).

---

## Tela: Fornecedores (tenant)

Modal largo, formulário em **3 seções**:

1. **Identificação** — Razão social*, Nome fantasia, CNPJ (máscara)
2. **Contato** — Nome do contato, Telefone (máscara), E-mail
3. **Endereço e observações** — Endereço, Observações (textarea)

API: `GET/POST /api/fornecedores`, `PUT/DELETE /api/fornecedores/:id`  
Referência: `apps/web/src/components/FornecedorForm.tsx`

---

## Prompt tenant (colar no Lovable após auth)

```
Crie o app Dental Lab — módulo laboratório (React + TypeScript + Tailwind).

Design: Outfit títulos, DM Sans corpo, sidebar escura #0c0f1a, cards brancos, botões com ícone Lucide.
API REST: base /api, Authorization Bearer, header X-Clinica-Id quando aplicável.

Menu:
- Cadastro: Empresa, Pacientes, Colaboradores, Fornecedores
- Laboratório: Próteses, Etiquetas, Status da Produção
- Dashboard

/login já existe — integrar com POST /api/auth/login.

/fornecedores: tabela + modal largo com seções Identificação, Contato, Endereço (máscaras CNPJ e telefone BR).
/colaboradores: tabela + modal CRUD; card "Perfis com RBAC" na página (Supervisor, Admin, Gestor, Recepção, Laboratório, Colaborador, Estagiário com descrição de cada um) — NÃO no login.

/pacientes: CRUD pacientes (nome, cpf, telefone, email, endereço).
/empresa: formulário matriz + unidades + licenciamento.

Responsivo desktop-first, estilo SaaS premium Inova/Excellence.
```

---

## Reintegração no monorepo

1. Exportar do Lovable (zip ou repo).
2. Copiar para `apps/web/src/pages/` e `apps/web/src/components/`.
3. Reutilizar `apps/web/src/api.ts` (não duplicar tipos/endpoints).
4. `npm run build -w @dental/web`
5. VPS:
   ```bash
   cd /opt/dental-lab-system
   bash infra/ops/redeploy-vps.sh
   ```

---

## Credenciais de teste (VPS)

| Usuário | Senha | Perfil |
|---------|-------|--------|
| supervisor | supervisor123 | Console MASTER |
| admin | admin123 | Tenant #1 |

Trocar após primeiro acesso: `docs/POS-DEPLOY-VPS.md`.

---

## Arquivos de referência no GitHub

Repo: https://github.com/Kadu207/Dental_lab.git

| Área | Caminhos |
|------|----------|
| API cliente | `apps/web/src/api.ts` |
| Auth | `apps/web/src/lib/auth.ts`, `pages/Login.tsx` |
| Supervisor | `pages/SupervisorCadastro.tsx`, `SupervisorTenants.tsx`, … |
| UI | `components/ui/ActionButton.tsx`, `Icons.tsx`, `PageHeader.tsx` |
| Máscaras | `lib/inputMasks.ts`, `lib/viacep.ts` |
| RBAC UI | `lib/rbac-perfis.ts`, `components/auth/RbacPerfilPoliticas.tsx` |
| Fornecedores | `components/FornecedorForm.tsx`, `pages/Fornecedores.tsx` |
| Rotas/menu | `App.tsx`, `index.css` |
