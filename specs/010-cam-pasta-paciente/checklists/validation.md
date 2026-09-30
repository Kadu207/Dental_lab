# Checklist — Onda 4 / 010 CAM

- [x] Novo paciente cria `paciente_pastas` + dirs em storage (smoke 2026-07-20)
- [x] Paciente legado: abrir pasta cria sob demanda
- [x] Upload STL → anexos + download com auth
- [x] Job `elegoo_mars5_ultra` print → `done` (hot folder)
- [x] Job `mill_generic` mill → `done` (hot folder)
- [ ] Tenant A não acessa anexo de B (404) — pendente multi-tenant Postgres
- [x] Scanner barcode (`/scanner`) inalterado (`status-flow` + scan)
- [x] `npm test` em apps/api (cam sanitize + registry)

Smoke API: PASS (Node 22 + sqlite). UI manual em `http://localhost:5173` com API em `:3333`.
