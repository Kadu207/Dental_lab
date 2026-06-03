# Handoff Frontend — Dental Lab → Lovable

Documento para recriar ou refinar o frontend no [Lovable](https://lovable.dev) e reintegrar ao monorepo `dental-lab-system`.

---

## 1. Objetivo

Produzir uma UI **administrativa premium** (referência: **Excellence Dental — console Suporte MASTER**) para o módulo **Supervisor Inova**, mantendo integração com a **API existente** (Express + Postgres multi-tenant).

O Lovable deve gerar **React + TypeScript + Tailwind** (preferencial). Ao retornar, os arquivos substituem ou complementam `apps/web/src/pages/` e `apps/web/src/components/`.

---

## 2. Stack atual (monorepo)

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, React Router 7, Vite 6 |
| Estilo | CSS custom (`index.css`) — migrar para Tailwind no Lovable |
| API | `apps/api` — Express, JWT, multi-tenant |
| Auth | Bearer token + header `X-Clinica-Id` |
| Deploy | Docker `lab-web` (nginx) + `lab-api` |

**Base URL API (produção):** `/api` (mesmo domínio) ou `VITE_DENTAL_LAB_API_URL`.

---

## 3. Design system (usar no Lovable)

### Tipografia
- **Display / títulos:** [Outfit](https://fonts.google.com/specimen/Outfit) — 600–800
- **Corpo / formulários:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — 400–700

### Cores (tokens)
```css
--sidebar-bg: #0c0f1a;
--sidebar-active: #6366f1;      /* indigo — item ativo */
--purple: #7c3aed;              /* botão Gerar licença */
--primary: #0f172a;
--accent: #059669;
--danger: #dc2626;
--warning: #d97706;
--bg: #f0f2f8;
--surface: #ffffff;
--muted: #64748b;
--border: #e2e8f0;
```

### Layout
- **Sidebar fixa** ~260px, fundo escuro gradiente, ícones + labels
- **Main** com padding generoso, cards com sombra suave
- **Page header:** ícone em quadrado roxo claro + título Outfit + subtítulo muted
- **Botões:** sempre com **ícone + texto** (Lucide React no Lovable)

### Referência visual
Console **Gerador de licenças** do Excellence Dental:
- Formulário em grid 2 colunas
- Botão roxo “+ Gerar licença” alinhado à direita
- Tabela “Licenças emitidas” com badges de status (Ativa verde, Revogada vermelha)
- Menu Suporte (MASTER): Cadastro, Importação, Backup, Gerador, Senha supervisor

---

## 4. Perfis e autenticação

> **Login, esqueci senha e RBAC:** ver também `docs/LOVABLE-AUTH-RBAC-HANDOFF.md`.

| Perfil | Acesso |
|--------|--------|
| `supervisor` | Menu Suporte (MASTER) — todas as rotas `/supervisor/*` |
| `admin` | Tenant + `/admin/licencas` |
| Operador tenant | Dashboard, Pacientes, Próteses, etc. (após selecionar tenant) |

**Login:** `POST /api/auth/login`  
Body: `{ "nome": "supervisor", "senha": "..." }`  
Resposta: `{ token, user, perfil }` — guardar token em `localStorage` (`dental_lab_token`).

Headers em todas as requests:
```
Authorization: Bearer <token>
Content-Type: application/json
X-Clinica-Id: <id>   // quando operando em tenant específico
```

Implementação de referência: `apps/web/src/api.ts`, `apps/web/src/lib/auth.ts`.

---

## 5. Rotas supervisor (prioridade Lovable)

| Rota | Tela | Descrição |
|------|------|-----------|
| `/supervisor/cadastro` | Cadastro de clientes | **Principal** — CRUD empresas + tabela + seleção múltipla |
| `/supervisor/tenants` | Gerador de licenças | Form + tabela licenças emitidas |
| `/supervisor/backup` | Backup de empresas | Export JSON + histórico |
| `/supervisor/import` | Importação de banco | Upload JSON → tenant existente ou novo |
| `/supervisor/conta` | Senha supervisor | Troca de senha |

Redirect pós-login supervisor → `/supervisor/cadastro`.

---

## 6. Tela: Cadastro de clientes (spec detalhada)

### 6.1 Tabela “Clientes provisionados”
Colunas:
- Checkbox (seleção múltipla + selecionar todos)
- **ID Lab** (`clinica_id`) + schema (`lab_tN`)
- Nome empresa (fantasia ou razão social)
- Código ED (`cliente_codigo`)
- **Excellence ID** (`excellence_clinica_id`)
- Status tenant (Ativo / Suspenso)
- **Status licença** (Ativa, Trial, Expirada, Sem licença…) + dias restantes
- Produto / Período da licença
- **Ações:** Editar, Ativar/Suspender, Licença (link), Remover

Barra de ações em lote (com ícones):
- Ativar selecionados
- Suspender selecionados
- Remover selecionados

### 6.2 Formulário (cadastro/edição)
Cada empresa recebe **ID Lab auto-incrementado** na criação.

Campos com **máscara**:
| Campo | Máscara / comportamento |
|-------|-------------------------|
| CNPJ | `00.000.000/0000-00` |
| CPF | `000.000.000-00` |
| CEP | `00000-000` + **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) |
| Telefones / WhatsApp | `(00) 00000-0000` |
| UF | 2 letras maiúsculas |

Lista completa de campos:
- Razão Social, Nome Fantasia
- CNPJ, CPF
- Inscrição Estadual, Inscrição Municipal
- CEP, Endereço, Número, Complemento, Bairro, Cidade, UF
- Telefone 01, Telefone 02, WhatsApp
- Email 01, Email 02
- Nome do Responsável, Contato, WhatsApp, Email do responsável
- Instagram, Facebook
- **Vínculo — ID Excellence Dental Cloud** (integer)
- Código comercial `ED-YYYYMMDD-NNNN`

Botões formulário:
- **Limpar** (ghost)
- **Cadastrar empresa** / **Salvar alterações** (primary ou purple, ícone save)

---

## 7. Tela: Gerador de licenças

### Formulário
1. Cliente provisionado (select): tenants + “Cadastrar nova” + “Preencher IDs manualmente”
2. Produto: Excellence Dental Cloud | Cloud + Lab | Dental Lab standalone
3. Período: Teste (7 dias), Teste (30 dias), 1/2/4/5 anos
4. Cliente (nome comercial)
5. Clínica ID
6. Cliente código (ED-*)
7. Observações internas (textarea)
8. Botão **Gerar licença** (roxo, ícone +)

### Tabela “Licenças emitidas”
Colunas: Chave (copiar), Cliente, Código ED, Produto, Período, Status, Clínica ID, Ações (Editar, Cancelar, Revogar).

---

## 8. API supervisor (endpoints)

Base: `/api/supervisor`

### Empresas / tenants
| Método | Path | Uso |
|--------|------|-----|
| GET | `/tenants/overview` | Lista com status de licença |
| GET | `/tenants` | Lista simples |
| GET | `/tenants/:clinicaId` | Detalhe |
| POST | `/tenants` | Criar (body = todos os campos) |
| PUT | `/tenants/:clinicaId` | Atualizar |
| DELETE | `/tenants/:clinicaId` | Remover cadastro (não apaga schema) |
| POST | `/tenants/bulk-status` | `{ clinicaIds: number[], status: "active"\|"suspended" }` |

### Licenças
| Método | Path | Uso |
|--------|------|-----|
| GET | `/licencas` | Todas as licenças (todos tenants) |
| POST | `/tenants/:id/licencas/gerar` | Gerar chave |
| PUT | `/licencas/:clinicaId/:id` | Editar |
| POST | `/licencas/:clinicaId/:id/cancelar` | Cancelar pendente |
| POST | `/licencas/:clinicaId/:id/revogar` | Revogar |

### Backup
| Método | Path | Uso |
|--------|------|-----|
| GET | `/backups` | Histórico |
| GET | `/tenants/:id/backup/export` | Download JSON (auth header) |
| POST | `/tenants/:id/backup/import` | Import no tenant |
| POST | `/backup/import` | Import + criar novo tenant |

Tipos TypeScript de referência: `apps/web/src/api.ts` (`TenantRecord`, `TenantOverview`, `TenantLicenseRow`).

---

## 9. Componentes reutilizáveis (já no repo)

Após export do Lovable, alinhar nomes ou substituir:

```
apps/web/src/components/ui/
  Icons.tsx          — SVG icons (ou trocar por lucide-react)
  ActionButton.tsx   — botão com ícone + variantes
  SidebarNavItem.tsx
  PageHeader.tsx
```

---

## 10. Prompt sugerido para colar no Lovable

```
Crie um painel admin "Dental Lab — Suporte MASTER" em React + TypeScript + Tailwind.

Referência visual: console administrativo SaaS dark sidebar (estilo Excellence Dental / Inova).

Fontes: Outfit (títulos), DM Sans (corpo).
Sidebar escura (#0c0f1a) com ícones Lucide: Cadastro de clientes, Gerador de licenças, Backup, Importação, Senha.

Página principal /supervisor/cadastro:
- Tabela de empresas com checkbox multi-select, ID Lab, status tenant, status licença com badge colorido, ações icon buttons (Editar, Ativar, Suspender, Licença, Remover).
- Barra bulk actions: Ativar, Suspender, Remover selecionados.
- Formulário completo abaixo com máscaras BR (CNPJ, CPF, CEP com ViaCEP, telefone).
- Campos: razão social, fantasia, endereço completo, contatos, responsável, redes sociais, vínculo ID Excellence Cloud, código ED.

Página /supervisor/tenants — Gerador de licenças:
- Form grid estilo Excellence: tenant, produto, período, cliente, clinica_id, código ED, observações.
- Botão roxo "Gerar licença".
- Tabela licenças emitidas com copiar chave, status Ativa/Revogada, ações Editar/Cancelar/Revogar.

Integração API REST JSON em /api/supervisor/* com Bearer token.
Design premium, cards com sombra, spacing generoso, responsivo desktop-first.
```

---

## 11. Como reintegrar após o Lovable

1. Exporte o projeto Lovable (zip ou GitHub).
2. Copie páginas para `apps/web/src/pages/Supervisor*.tsx`.
3. Mantenha `apps/web/src/api.ts` — adapte hooks do Lovable para usar `api.supervisor.*`.
4. Remova Tailwind duplicado se o monorepo continuar com CSS modules; **ou** migre `apps/web` inteiro para Tailwind (adicionar PostCSS no Vite).
5. Teste: `npm run build -w @dental/web`.
6. Deploy VPS: `bash infra/ops/redeploy-vps.sh`.

---

## 12. Credenciais de teste (VPS)

| Usuário | Senha default | Perfil |
|---------|---------------|--------|
| supervisor | supervisor123 | supervisor |
| admin | admin123 | admin (tenant #1) |

Trocar senhas após primeiro acesso (`docs/POS-DEPLOY-VPS.md`).

---

## 13. Arquivos de referência no repo

| Arquivo | Conteúdo |
|---------|----------|
| `apps/web/src/pages/SupervisorCadastro.tsx` | Cadastro completo |
| `apps/web/src/pages/SupervisorTenants.tsx` | Gerador licenças |
| `apps/web/src/lib/inputMasks.ts` | Máscaras BR |
| `apps/web/src/lib/viacep.ts` | Integração CEP |
| `apps/web/src/lib/licenseCatalog.ts` | Produtos e períodos |
| `apps/web/src/App.tsx` | Rotas e menu sidebar |
| `apps/web/src/index.css` | Tokens CSS atuais |

---

---

## 14. Ver também

- Índice geral: `docs/LOVABLE-INDEX.md`
- Login e RBAC: `docs/LOVABLE-AUTH-RBAC-HANDOFF.md`

*Última atualização: commit `0cbb241` — supervisor + tenant (fornecedores em seções).*
