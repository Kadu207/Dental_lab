# Tasks: Hardening auditoria 5 falhas

- [x] T001 JWT/secrets: config.ts + testes; abortar produção se secret fraco
- [x] T002 Seed passwords: init.ts usa env; default admin123/supervisor123 só fora de produção
- [x] T003 PASSWORD_RESET_EXPOSE_TOKEN default false
- [x] T004 Remover VITE_DENTAL_LAB_LICENSE_KEY do web
- [x] T005 GET /licencas/status exige auth; clinicaId do token
- [x] T006 listLicenses filtra por tenant; gerar amarra clinica do ator
- [x] T007 authGate antes de licenseGate; license usa req.auth.clinicaId
- [x] T008 sanitizePermissoesPayload + PUT /usuarios/:id/permissoes
- [x] T009 grupos POST só TENANT_PERFIS + canManagePerfil
- [x] T010 Validar STL/PLY/OBJ no upload CAM
- [x] T011 Validar cliente + logoUrl png/jpeg
- [x] T012 PermissionGate nas rotas; isPlatformUser de /me
- [x] T013 RLS Postgres + SET LOCAL no withLabClient
- [x] T014 Testes + tsc + vitest passing
- [x] T015 CORS: fail-closed em produção (lista obrigatória, sem `*`)
- [x] T016 Odontograma: allowlist de `condition` + FDI permanente
- [x] T017 Relatórios: JOIN de clientes também por `clinica_id`
