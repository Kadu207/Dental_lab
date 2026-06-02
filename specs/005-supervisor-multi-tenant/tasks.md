# Tasks: 005-supervisor-multi-tenant (Fase 1)

## Fase 1 — Fundação (esta entrega)

- [x] T001 Criar spec.md, plan.md, tasks.md em `specs/005-supervisor-multi-tenant/`
- [x] T002 Adicionar `schema-platform.sql` (tenants + platform_usuarios)
- [x] T003 Implementar `tenants/registry.ts` (resolve, list, create, update)
- [x] T004 Implementar `tenants/provision.ts` (DDL por schema)
- [x] T005 Integrar platform init + seed em `initPostgres()`
- [x] T006 `openLabClient` resolve schema via registry
- [x] T007 RBAC: perfil supervisor, rank, `canManagePerfil`, `requireSupervisor`
- [x] T008 Auth platform login + enrich supervisor + license exempt
- [x] T009 API `GET/POST/PUT /api/supervisor/tenants`
- [x] T010 Rank enforcement em `usuarios.ts`
- [x] T011 P0: clinica_id em SELECTs pós-mutação (rotas core)
- [x] T012 Testes RBAC rank + supervisor policies
- [x] T013 `npm test` + `npm run build`

## Fase 2 — UI Supervisor (esta entrega)

- [x] T020 Página `/supervisor/tenants` CRUD
- [x] T021 Proxy licença Gerador por tenant (status remoto + gerar no schema)
- [x] T022 Seletor tenant no header (supervisor)

## Fase 3 — Backup/Import

- [x] T030 Export lógico por `clinica_id`
- [x] T031 Import para schema existente ou novo tenant
- [x] T032 Scripts ops VPS

## Fase 4 — License write-guard

- [x] T040 Bloqueio writes com licença expirada
- [x] T041 Sync status Gerador → tenants
