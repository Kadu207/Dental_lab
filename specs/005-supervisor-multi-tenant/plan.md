# Plan: Supervisor Multi-Tenant (Fase 1)

## Technical Approach

### 1. Platform layer (Postgres)

- Schema `dental_lab_platform` (`DENTAL_LAB_PLATFORM_SCHEMA`).
- Tabelas: `tenants`, `platform_usuarios`.
- Init em `initPostgres()` após schema tenant legado.
- Seed: tenant `1 → dental_lab`, supervisor default.

### 2. Tenant provisioning

- `provisionTenantSchema(pool, schemaName)`: clona DDL de `schema-postgres.sql` substituindo `dental_lab`.
- Novos tenants: `lab_t{clinica_id}`.
- `resolveTenantSchema(clinicaId)` com cache em memória.

### 3. RBAC

- `supervisor` rank 200, política wildcard.
- `TENANT_PERFIS` exclui supervisor.
- `canManagePerfil(actor, target)` para enforcement em `usuarios.ts`.
- `requireSupervisor()` middleware.

### 4. Auth

- `loginPlatformUser()` antes de `loginStandalone()`.
- Supervisor JWT: `clinicaId: 0`; rotas tenant usam `getClinicaId()` + `X-Clinica-Id`.
- `enrichAuthPermissions` short-circuit para supervisor.

### 5. P0 IDOR

- Pós-UPDATE/INSERT SELECTs MUST incluir `clinica_id = ?`.
- Arquivos: `proteses`, `procedimentos`, `financeiro`, `fornecedores`, `estoque`, `usuarios`, `clientes`, `empresa`.

### 6. Pipeline

- Sem alteração em Docker/CI além de novos testes.
- Dual-mode: embedded inalterado para supervisor (platform standalone-only).

## Files

| Área | Paths |
|------|-------|
| Platform | `apps/api/src/db/schema-platform.sql`, `apps/api/src/tenants/*.ts` |
| DB | `apps/api/src/db/client.ts`, `apps/api/src/db/init.ts` |
| Auth | `apps/api/src/auth/platform.ts`, `rbac.ts`, `enrich.ts`, `routes/auth.ts` |
| API | `apps/api/src/routes/supervisor/tenants.ts`, `helpers.ts` |
| Middleware | `license.ts`, `middleware/auth.ts` |
| Config | `apps/api/src/config.ts`, `.env.example` |

## Constitution Check

| Princípio | Status |
|-----------|--------|
| SDD | spec 005 aprovada |
| Multi-tenant | schema + clinica_id |
| RBAC | supervisor + rank |
| Tests | rbac + rank tests |
| Dual-mode | embedded path preserved |
| YAGNI | Fase 1 sem UI/backup |
