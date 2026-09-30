# Integrações Chatwoot e N8N — Dental Lab

> Planejamento aprovado 2026-07-19. **Implementação Onda 3 (spec 012)** entregue no Lab — validar checklist em `specs/012-integracoes-chatwoot-n8n/checklists/validation.md`. Espelha o padrão do Excellence Dental Cloud.

## Objetivo

No modo **standalone**, o Lab dispara eventos de ciclo de vida (tenant/licença/CAM) para N8N e Chatwoot (via workflows N8N). No modo **embedded**, o CRM continua no Excellence — o Lab **não duplica** eventos se `source=excellence` no payload.

## Variáveis de ambiente (previstas)

```env
INTEGRATIONS_ENABLED=true
N8N_WEBHOOK_URL=https://…/webhook/dental-lab-n8n
N8N_WEBHOOK_SECRET=
CHATWOOT_WEBHOOK_URL=https://…/webhook/dental-lab-chatwoot
CHATWOOT_WEBHOOK_SECRET=
```

Secrets nunca versionados. HMAC opcional mas recomendado.

## Rotas previstas (API)

| Método | Rota | Quem |
|--------|------|------|
| GET | `/api/integracoes/status` | Supervisor / admin plataforma |
| POST | `/api/integracoes/n8n/disparar` | Supervisor / admin plataforma |
| POST | `/api/integracoes/chatwoot/enviar` | Supervisor / admin plataforma |
| POST | `/api/webhooks/n8n` | N8N (secret) |
| POST | `/api/webhooks/chatwoot` | Chatwoot/N8N (secret) |

Webhooks fora do license gate do tenant (como `/supervisor`).

## Eventos mínimos

- `tenant_onboarded`
- `tenant_updated`
- `tenant_suspended`
- `licenca_gerada`
- Opcional depois: `protese_status_changed`, `cam_job_done`

Disparo **não bloqueante**: falha de webhook não reverte o cadastro do tenant.

Entrada deduplica em `integration_events` (`Idempotency-Key`, senão `id`/`event_id`, senão hash do corpo). Repetição: `{ ok: true, deduplicated: true }`. Saída repete até 3 vezes (rede, 408, 429, 5xx) com o mesmo corpo e a mesma chave. Ver [DB-MIGRACAO-E-HARDENING.md](./DB-MIGRACAO-E-HARDENING.md).

## Dual-mode

| Modo | Comportamento |
|------|----------------|
| standalone | Lab emite eventos |
| embedded | Preferir eventos do Excellence; Lab só emite se flag explícita |

## Pré-requisito ops

DNS/túnel HTTPS dos webhooks N8N na VPS Inova. Paths dedicados: `dental-lab-n8n`, `dental-lab-chatwoot`.

## Relação com outras specs

- Spec `011` (empresas): hooks `createTenant` / status disparam eventos
- Spec `010` (CAM): eventos opcionais de job
