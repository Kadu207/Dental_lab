# Feature Specification: Pasta digital do paciente + CAM registry

**Feature Branch**: `010-cam-pasta-paciente`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 4 — CAM-CONNECTOR fases 010.1–010.3 (piloto)

## User Scenarios & Testing

### User Story 1 - Pasta automática (Priority: P1)

Ao cadastrar paciente, a pasta digital existe no DB (+ dirs de storage).

**Acceptance Scenarios**:

1. **Given** `POST /api/clientes`, **When** sucesso, **Then** existe `paciente_pastas` 1:1 e dirs sob storage.
2. **Given** paciente legado sem pasta, **When** lista anexos, **Then** pasta é criada sob demanda (ensure).

### User Story 2 - Anexos / scans (Priority: P1)

Operador sobe STL/PLY/OBJ na ficha e baixa com auth.

**Acceptance Scenarios**:

1. **Given** ficha aberta, **When** upload octet-stream, **Then** grava arquivo em disco + metadados em `paciente_anexos`.
2. **Given** anexo existente, **When** download autenticado, **Then** recebe o binário (tenant isolado).
3. **Given** outro `clinica_id`, **When** tenta acessar id, **Then** 404.

### User Story 3 - Jobs CAM stub (Priority: P2)

Operador cria job print/mill com adapter do registry (filesystem / elegoo perfil / mill).

**Acceptance Scenarios**:

1. **Given** anexo scan, **When** `POST /api/cam/jobs` com `adapterId=filesystem` e `capability=print`, **Then** job `queued`→`sent`/`done` via FilesystemAdapter (hot folder + `.done` stub).
2. **Given** `GET /api/cam/adapters`, **Then** lista registry incluindo slots Elegoo/mill (mesmo se stub).

## Requirements

- **FR-001**: Tabelas `paciente_pastas`, `paciente_anexos`, `cam_jobs` (sqlite + postgres + provision).
- **FR-002**: Storage `DENTAL_LAB_STORAGE_ROOT` default `./data/lab`.
- **FR-003**: API pasta anexos sob `/api/pacientes/:id/pasta/...` (alias clientes).
- **FR-004**: `CamAdapter` registry + FilesystemAdapter; slots `elegoo_mars5_ultra`, `mill_generic`.
- **FR-005**: UI pasta na ficha do paciente; não misturar com Scanner barcode.
- **FR-006**: RBAC `clientes` para pasta; `proteses` write para criar job (ou clientes write).

## Success Criteria

- Aceite piloto doc: pasta + import STL + job print/mill stub + isolamento tenant.
- Sem build de produção nesta onda.
- SDCP Elegoo real / agente on-prem = fora (010.4+).
