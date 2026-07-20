# Feature Specification: Pacientes — busca, ficha e alias /pacientes

**Feature Branch**: `007-pacientes-ficha`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 2 — evoluir cadastro de pacientes (clientes)

## User Scenarios & Testing

### User Story 1 - Busca na listagem (Priority: P1)

Operador filtra pacientes por nome, CPF ou telefone sem paginar tudo.

**Acceptance Scenarios**:

1. **Given** pacientes cadastrados, **When** digita trecho do nome em `q`, **Then** a lista retorna apenas coincidências (case-insensitive) no tenant.
2. **Given** busca por CPF parcial, **When** consulta `GET /api/clientes?q=`, **Then** filtra por `cpf` também.
3. **Given** `q` vazio, **When** lista, **Then** comportamento atual (paginação) permanece.

### User Story 2 - Ficha do paciente (Priority: P1)

Operador abre a ficha e vê dados + próteses relacionadas + atalho odontograma.

**Acceptance Scenarios**:

1. **Given** paciente existente, **When** abre `/pacientes/:id`, **Then** vê dados cadastrais e lista de próteses do paciente.
2. **Given** ficha aberta, **When** clica odontograma, **Then** navega para `/odontograma` com paciente selecionável/contexto.

### User Story 3 - Alias de rota (Priority: P2)

Menu e URLs usam `/pacientes` além de `/clientes`.

**Acceptance Scenarios**:

1. **Given** app autenticado, **When** acessa `/pacientes`, **Then** vê a mesma listagem de pacientes.
2. **Given** `/clientes`, **When** acessa, **Then** continua funcionando (redirect ou mesma página).

### Edge Cases

- Busca com caracteres especiais SQL — usar parâmetros bound.
- Paciente sem próteses — ficha mostra estado vazio.
- Tenant isolation — nunca vaza outro `clinica_id`.

## Requirements

- **FR-001**: `GET /api/clientes` aceita `q` (nome/cpf/telefone).
- **FR-002**: `GET /api/clientes/:id/ficha` (ou equivalente) retorna cliente + próteses.
- **FR-003**: Rotas web `/pacientes` e `/pacientes/:id`; alias `/clientes`.
- **FR-004**: RBAC `clientes` inalterado; sempre `clinica_id`.

## Success Criteria

- Busca + ficha usáveis no desktop e mobile (drawer 006).
- Dual-mode standalone/embedded sem regressão de auth.
