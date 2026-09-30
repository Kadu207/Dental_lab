# Feature Specification: Hardening — auditoria das 5 falhas

**Feature Branch**: `013-hardening-auditoria-5-falhas`  
**Created**: 2026-08-18  
**Status**: Approved (implementação autorizada pelo produto)

## Contexto

Auditoria estática encontrou falhas típicas de app gerado por IA. Não há Supabase/Firebase em runtime; o análogo de RLS é Postgres multi-tenant.

## User Stories

### P1 — Segredos de produção

**Given** `NODE_ENV=production` sem JWT forte, **When** a API sobe, **Then** aborta com erro claro.  
**Given** SMTP desligado, **When** solicitar recuperação, **Then** a API **não** devolve `resetToken`.

### P1 — Licenças isoladas por tenant

**Given** usuário não autenticado, **When** GET `/api/licencas/status`, **Then** 401.  
**Given** admin do tenant A, **When** GET `/api/licencas`, **Then** só vê licenças de A.  
**Given** admin do tenant A, **When** POST `/gerar` com `clinica_id` de B, **Then** a licença fica em A (ou 403).

### P1 — Sem auto-promoção RBAC

**Given** gestor, **When** PUT permissoes com `resource: "*"`, **Then** 400.  
**Given** gestor, **When** POST grupos com role `supervisor`, **Then** 400.

### P1 — Upload CAM tipado

**Given** upload com extensão `.html` ou MIME `text/html`, **When** POST anexos, **Then** 400.  
**Given** STL/PLY/OBJ válido, **Then** 201.

### P2 — RLS Postgres

**Given** conexão Postgres no `withLabClient(clinicaId)`, **When** query em tabela tenant, **Then** `app.clinica_id` está setado e RLS FORCE está ativo.

## Requirements

- JWT sem fallback fraco em produção (mín. 32 chars, ≠ default de dev)
- Senhas seed default proibidas em produção
- `PASSWORD_RESET_EXPOSE_TOKEN` default `false`
- Remover `VITE_DENTAL_LAB_LICENSE_KEY` do bundle
- Auth antes de licenseGate; status de licença autenticado
- `listLicenses` filtra por `clinica_id` (plataforma pode listar tudo)
- `sanitizePermissoesPayload`: sem `*`; resources/actions allowlist; `canManagePerfil`
- Grupos: só `TENANT_PERFIS` e rank menor que o ator
- Validar tipo de arquivo CAM no servidor
- Validar logo `data:image/png|jpeg` e payload de cliente
- PermissionGate nas rotas da web; `isPlatformUser` vem de `/auth/me`
- RLS ENABLE+FORCE nas tabelas tenant (exceto `product_licenses`)
- CORS em produção: `DENTAL_LAB_CORS_ORIGINS` obrigatório (sem lista vazia e sem `*`)
- Odontograma: `condition` só da allowlist do domínio; FDI da arcada permanente
- Relatórios: JOIN `clientes` também por `clinica_id`
