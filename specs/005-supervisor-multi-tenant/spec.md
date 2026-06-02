# Feature Specification: Supervisor Multi-Tenant (Schema por Cliente)

**Feature Branch**: `005-supervisor-multi-tenant`  
**Created**: 2026-05-24  
**Status**: Approved (Fase 1)  
**Input**: Schema Postgres por cliente, hierarquia Supervisor > Admin > Login empresa > Colaboradores, CRUD tenants, backup/import por ID, P0 isolamento tenant.

## Contexto

- **Isolamento**: um schema Postgres por empresa (`lab_t{N}`), registry central em `dental_lab_platform.tenants`.
- **`clinica_id` Lab** ≠ **`cliente_codigo` comercial** (Gerador de Licenças / Excellence ERP).
- **Modos**: standalone (multi-tenant na VPS) e embedded (schema dedicado no cluster ERP) — mesma API.
- **Fases**: 1 spec+RBAC+tenants → 2 UI supervisor → 3 backup/import → 4 license write-guard.

## User Stories

### P0 — Isolamento tenant (IDOR)

**Given** usuário autenticado da clínica A, **When** acessa recurso da clínica B por ID, **Then** 404 ou 403 — nunca dados de outro tenant.

**Independent Test**: testes automatizados + auditoria de queries com `clinica_id`.

### P0 — Hierarquia RBAC

**Given** gestor autenticado, **When** tenta criar/editar usuário admin ou gestor par, **Then** 403 FORBIDDEN.

**Given** supervisor autenticado, **When** acessa `/api/supervisor/tenants`, **Then** 200 com lista de tenants.

**Given** admin tenant, **When** acessa `/api/supervisor/tenants`, **Then** 403.

### P1 — Registry de tenants (Fase 1)

**Given** Postgres standalone, **When** API inicia, **Then** schema platform existe, tenant padrão `clinica_id=1` → `dental_lab`.

**Given** supervisor, **When** POST tenant com razão social, **Then** novo schema `lab_t{N}` provisionado e registro em `tenants`.

### P2 — UI Supervisor (Fase 2 — fora do escopo imediato)

CRUD tenants + licença via proxy Gerador.

### P3 — Backup/Import (Fase 3)

Export/import lógico por `clinica_id` Lab.

## Requirements

### Functional Requirements

- **FR-001**: Registry `tenants` MUST mapear `clinica_id` Lab → `postgres_schema`.
- **FR-002**: `LabDbClient` MUST resolver schema via registry antes de qualquer query tenant.
- **FR-003**: Perfil `supervisor` MUST existir com rank 200; tenants MUST NOT criar perfil supervisor.
- **FR-004**: Criação/alteração de colaboradores MUST exigir `rank(actor) > rank(target)`.
- **FR-005**: Supervisor MUST autenticar via `platform_usuarios`; rotas tenant exigem header `X-Clinica-Id`.
- **FR-006**: Rotas `/api/supervisor/*` MUST ser acessíveis apenas por supervisor; isentas de license gate.
- **FR-007**: Campo `cliente_codigo` MUST permitir vínculo comercial sem confundir com `clinica_id` Lab.
- **FR-008**: Tenant padrão (id=1) MUST permanecer compatível com deploy existente (`dental_lab`).

### Key Entities

- **Tenant**: `clinica_id`, `postgres_schema`, `nome_fantasia`, `razao_social`, `cnpj`, `cliente_codigo`, `status`.
- **PlatformUsuario**: conta supervisor (fora dos schemas tenant).
- **LabUsuario**: conta operacional dentro do schema tenant.

## Success Criteria

- **SC-001**: Zero queries de leitura pós-mutação sem filtro `clinica_id` nas rotas core.
- **SC-002**: Testes RBAC incluem supervisor e rank enforcement.
- **SC-003**: `npm test` e `npm run build` passam sem regressão.
- **SC-004**: Login produção (`/api/auth/me`) continua funcional após deploy.

## Assumptions

- Fase 1 não inclui UI web supervisor nem backup/import.
- SQLite dev permanece single-tenant; platform registry é Postgres-only.
- Supervisor seed via env `DENTAL_LAB_SUPERVISOR_PASSWORD` em standalone.
