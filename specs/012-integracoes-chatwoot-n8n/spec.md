# Feature Specification: Integrações Chatwoot e N8N

**Feature Branch**: `012-integracoes-chatwoot-n8n`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 3 — eventos de ciclo de vida + webhooks HMAC

## User Scenarios & Testing

### User Story 1 - Status e disparo manual (Priority: P1)

Supervisor vê se integrações estão habilitadas e dispara teste.

**Acceptance Scenarios**:

1. **Given** supervisor autenticado, **When** `GET /api/integracoes/status`, **Then** retorna flags e URLs mascaradas (sem secrets).
2. **Given** `INTEGRATIONS_ENABLED=true` e URL N8N, **When** `POST /api/integracoes/n8n/disparar`, **Then** envia payload HMAC e responde ok/erro sem derrubar a API.

### User Story 2 - Eventos de domínio (Priority: P1)

Ciclo de vida do tenant dispara eventos não bloqueantes.

**Acceptance Scenarios**:

1. **Given** createTenant sucesso, **When** onboard completa, **Then** emite `tenant_onboarded` (se enabled).
2. **Given** bulk-status `suspended`, **When** atualiza, **Then** emite `tenant_suspended`.
3. **Given** gera licença, **When** sucesso, **Then** emite `licenca_gerada`.
4. **Given** webhook externo falha, **When** evento dispara, **Then** cadastro/licença **não** reverte.

### User Story 3 - Webhooks inbound (Priority: P2)

N8N/Chatwoot postam em `/api/webhooks/*` com secret.

**Acceptance Scenarios**:

1. **Given** secret configurado, **When** header inválido, **Then** 401.
2. **Given** secret ok, **When** POST, **Then** 200 `{ ok: true }` (ack; processamento mínimo).

### Dual-mode

- standalone: emite se `INTEGRATIONS_ENABLED`.
- embedded: **não** emite por padrão (CRM no Excellence); só com `INTEGRATIONS_FORCE_IN_EMBEDDED=true`.

## Requirements

- **FR-001**: Env `INTEGRATIONS_*`, `N8N_*`, `CHATWOOT_*` em config + `.env.example`.
- **FR-002**: Helper HMAC outbound + `emitIntegrationEvent`.
- **FR-003**: Rotas `/api/integracoes/*` (requireSupervisor) e `/api/webhooks/*` (exempt auth/license).
- **FR-004**: Hooks em create/update/status/licença.
- **FR-005**: UI supervisor status + teste.

## Success Criteria

- Docs `INTEGRACOES-CHATWOOT-N8N.md` alinhadas ao código.
- Teste unitário do gate de emissão / assinatura HMAC.
