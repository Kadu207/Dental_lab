# Plan: Hardening auditoria 5 falhas

## Ordem

1. JWT / senhas seed / reset token
2. IDOR licenças + ordem dos gates
3. PUT permissoes / role supervisor
4. Upload CAM + validação de input
5. RLS Postgres
6. Frontend (PermissionGate, VITE key)

## Stack

Sem dependência nova. Vitest na API. RLS só em Postgres; SQLite inalterado.

## RLS

`ENABLE` + `FORCE ROW LEVEL SECURITY`. Policy: `clinica_id = NULLIF(current_setting('app.clinica_id', true), '')::int`.  
`withLabClient` em Postgres: `BEGIN` → `set_config(..., true)` → work → `COMMIT/ROLLBACK`.  
Não aplicar RLS em `product_licenses` (serviço usa pool cru).
