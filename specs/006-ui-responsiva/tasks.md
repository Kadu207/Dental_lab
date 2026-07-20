# Tasks: UI responsiva (006)

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)  
**Prerequisites**: Onda 0 docs âœ… Â· autorizaÃ§Ã£o cÃ³digo âœ…

**Tests**: checklist EDD (viewports) â€” obrigatÃ³rio antes de marcar onda validada.

## Phase 1: Setup

- [x] T001 Criar `specs/006-ui-responsiva/{spec,plan,tasks}.md`
- [x] T002 Persistir feature em `.specify/feature.json`

## Phase 2: Foundational

- [x] T003 [P] Adicionar `IconMenu` e `IconClose` em `apps/web/src/components/ui/Icons.tsx`
- [x] T004 Estender CSS mobile drawer/topbar/backdrop/table-wrap em `apps/web/src/index.css` (substituir sidebar 100% width)

## Phase 3: User Story 1 â€” Drawer (P1)

- [x] T005 [US1] Estado `navOpen` + topbar hamburger + backdrop + Escape em `apps/web/src/App.tsx`
- [x] T006 [US1] Fechar drawer ao clicar `NavLink` / `SidebarNavItem`
- [x] T007 [US1] `aria-expanded` / `aria-controls` / labels pt-BR

## Phase 4: User Story 2 â€” CRUD mobile (P2)

- [x] T008 [US2] Garantir `.table-wrap` ou wrapper overflow nas listagens crÃ­ticas (CSS global + checagem pÃ¡ginas)
- [x] T009 [US2] Confirmar `.form-grid` 1 coluna jÃ¡ coberta em â‰¤768px

## Phase 5: User Story 3 â€” Dual-mode (P3)

- [x] T010 [US3] Verificar shell com `IS_EMBEDDED` (badge + drawer) sem regressÃ£o de logout oculto

## Phase 6: Validation (gate antes da Onda 2)

- [ ] T011 Checklist 375 / 768 / 1280 â€” login, dashboard, pacientes, prÃ³teses, financeiro
- [ ] T012 Marcar onda 1 validada com usuÃ¡rio (sem avanÃ§ar para 007 atÃ© OK)
- [ ] T013 Sem `docker compose build` / `npm run build` de produÃ§Ã£o atÃ© liberaÃ§Ã£o explÃ­cita pÃ³s-validaÃ§Ã£o

## Parallel

T003 âˆ¥ T004 apÃ³s T002.
