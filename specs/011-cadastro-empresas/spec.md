# Feature Specification: Cadastro de empresas — paridade Excellence

**Feature Branch**: `011-cadastro-empresas`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 3 — unidades no onboard, logo na Empresa, atalho de licença no supervisor

## User Scenarios & Testing

### User Story 1 - Unidades no onboard (Priority: P1)

Supervisor cria um laboratório e já informa filiais iniciais.

**Acceptance Scenarios**:

1. **Given** payload com `unidades[]` (nome obrigatório), **When** `POST /api/supervisor/tenants`, **Then** cada unidade é inserida em `empresa_unidades` com trial.
2. **Given** `unidades` vazio/ausente, **When** cria tenant, **Then** só matriz (comportamento atual).

### User Story 2 - Logo na página Empresa (Priority: P1)

Admin do tenant gerencia logo sem ir só em Configuração.

**Acceptance Scenarios**:

1. **Given** página Empresa, **When** envia PNG/JPG, **Then** grava em `config/lab.logoUrl` (base64).
2. **Given** logo existente, **When** remove, **Then** `logoUrl` fica vazio.

### User Story 3 - Atalho de licença no cadastro (Priority: P2)

Após selecionar empresa no cadastro, “Licença” abre o painel de licenças com o tenant selecionado.

**Acceptance Scenarios**:

1. **Given** empresa na lista, **When** clica Licença, **Then** navega para `/supervisor/tenants` com tenant setado.
2. **Given** create bem-sucedido, **When** vê mensagem, **Then** texto orienta usar Licença.

## Requirements

- **FR-001**: Seed de unidades no createTenant (rollback se falhar).
- **FR-002**: UI Empresa com upload/remoção de logo via config lab.
- **FR-003**: UI SupervisorCadastro: unidades opcionais + atalho licença claro.
- **FR-004**: Sempre `clinica_id`; RBAC empresa/supervisor inalterado.

## Success Criteria

- Onboard cobre matriz + filiais opcionais.
- Logo visível na Empresa (mesmo storage que Configuração).
- Dual-mode sem regressão.
