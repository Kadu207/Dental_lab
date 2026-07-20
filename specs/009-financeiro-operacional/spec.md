# Feature Specification: Financeiro operacional

**Feature Branch**: `009-financeiro-operacional`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 5 — após CAM (010)

## User Scenarios & Testing

### User Story 1 - Listar e filtrar (Priority: P1)

Operador filtra lançamentos por status e período de vencimento.

**Acceptance Scenarios**:

1. **Given** lançamentos em datas distintas, **When** `GET /api/financeiro?de=&ate=`, **Then** retorna só o intervalo.
2. **Given** filtro `status=Pendente`, **When** lista, **Then** só pendentes.
3. **Given** `GET /api/financeiro/resumo?de=&ate=`, **Then** retorna receitas, despesas e saldo do período.

### User Story 2 - CRUD completo (Priority: P1)

Operador cria, edita e exclui lançamentos; marca status de pagamento.

**Acceptance Scenarios**:

1. **Given** formulário válido, **When** POST, **Then** 201 com campos mapeados.
2. **Given** lançamento existente, **When** PUT (status/valor), **Then** atualiza.
3. **Given** delete, **When** confirma, **Then** 204 e some da lista.

### User Story 3 - Vínculo opcional (Priority: P2)

Lançamento pode referenciar paciente e/ou prótese do mesmo tenant.

**Acceptance Scenarios**:

1. **Given** `pacienteId` válido, **When** cria, **Then** persiste vínculo.
2. **Given** `pacienteId` de outro tenant / inexistente, **When** cria, **Then** 400/404.
3. **Given** `proteseId` de outro paciente, **When** cria com paciente diferente, **Then** 400.

## Fora de escopo

PIX, boleto, NF-e, gateway de pagamento, conciliação bancária.

## Requirements

- **FR-001**: Colunas opcionais `paciente_id`, `protese_id`.
- **FR-002**: Filtros `status`, `de`, `ate`, `pacienteId`.
- **FR-003**: Endpoint `/resumo` server-side.
- **FR-004**: UI com editar + filtros período + nav Financeiro.
- **FR-005**: RBAC `financeiro` + `clinica_id`.

## Success Criteria

- Totais batem com o período filtrado (não só lista parcial sem filtro de data).
- Menu acessível para perfis com permissão.
- Sem build de produção nesta onda.
