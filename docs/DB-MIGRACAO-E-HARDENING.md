# DB Migracao e Hardening (Dental Lab)

Este projeto inicializa e evolui schema via `apps/api/src/db/init.ts` e arquivos SQL base:

- `apps/api/src/db/schema-postgres.sql`
- `apps/api/src/db/schema-platform.sql`

## Fluxo seguro de migracao (standalone)

1. Subir stack:
   - `docker compose -f docker-compose.standalone.yml up -d --build`
2. Gerar backup antes da mudanca:
   - `pwsh ./infra/ops/backup-standalone.ps1`
3. Aplicar alteracoes de schema no codigo (`init.ts` + SQL base).
4. Rebuild/restart da API para aplicar migracoes idempotentes:
   - `docker compose -f docker-compose.standalone.yml up -d --build lab-api`
5. Validar saude:
   - `pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180`

## Smoke de isolamento de tenant (clinica_id)

Para validar CRUD com dois tenants distintos no banco standalone:

- `pwsh ./scripts/tenant_clinica_smoke.ps1`

Esse smoke executa `scripts/tenant_clinica_smoke.sql` e valida:

- create/read/update/delete para `clinica_id = 101`
- create/read/update/delete para `clinica_id = 202`
- ausencia de residuos apos limpeza

## Observacoes de seguranca

- Em producao, use secrets fortes para `LAB_POSTGRES_PASSWORD` e `DENTAL_LAB_JWT_SECRET`.
- Evite manter credenciais default (`admin/admin123`) apos bootstrap inicial.
- Use backups recorrentes (`infra/ops/backup-postgres-vps.sh`) e rotina de restore testado.
