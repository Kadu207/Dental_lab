# Feature Specification: Excellence Fase 4 — ganchos de negócio no Lab

**Feature Branch**: `008-excellence-fase4`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Fechar contratos Lab já previstos em EXCELLENCE-FASE4.md (UI Excellence pode ser MR separado no repo irmão)

## User Scenarios & Testing

### User Story 1 - Sync ERP documentado e testável (Priority: P1)

`POST /api/clientes/sync-erp` permanece estável; smoke/contrato documentado para o BFF Excellence chamar.

**Acceptance Scenarios**:

1. **Given** payload com `erpPacienteId` + `nome`, **When** sync-erp, **Then** upsert no tenant e retorna `synced`.
2. **Given** mesmo `erpPacienteId` de novo, **When** sync, **Then** atualiza sem duplicar.

### User Story 2 - Criar prótese a partir de paciente Lab (Priority: P1)

API/UI Lab permitem criar prótese vinculada ao paciente da ficha (base para o botão futuro no ERP).

**Acceptance Scenarios**:

1. **Given** ficha do paciente, **When** “Nova prótese”, **Then** abre fluxo de criação com `pacienteId` pré-preenchido.

### User Story 3 - Consulta status por código (Priority: P2)

`GET /api/proteses/codigo/:codigo` documentado/verificado para widget da clínica.

**Acceptance Scenarios**:

1. **Given** prótese existente, **When** consulta por código, **Then** retorna status atual no tenant.

## Requirements

- **FR-001**: Garantir rotas sync-erp + proteses por código com `requirePolicy` e `clinica_id`.
- **FR-002**: Atalho na ficha Lab → criar prótese.
- **FR-003**: Atualizar `EXCELLENCE-FASE4.md` com contrato exato dos payloads (Lab).
- **FR-004**: Itens de UI no Excellence (botão ficha clínica) ficam checklist para o repo Excellence — não bloqueiam aceite Lab desta onda.

## Success Criteria

- Lab self-contained: sync + ficha→prótese + get by codigo OK.
- Docs Fase 4 atualizados; sem build produção obrigatório nesta onda.
