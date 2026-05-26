# Plan: Integração Excellence + Produção

## Approach

1. Add limit/offset query params to clientes and proteses list routes
2. Create `.specify/migrations/001_wip_tables.sql` as reference migration
3. Update apps/api/.env.example with production-required vars
4. Update README.md for dual DB drivers

## Acceptance

Paginated list works; migration file exists; env docs complete.
