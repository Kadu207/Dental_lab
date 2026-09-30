# Plan: 012 Chatwoot/N8N

## Approach

1. Config + `.env.example`.
2. `apps/api/src/integracoes/` — emit, hmac, status.
3. Rotas + exempt prefixes em auth/license.
4. Hooks nas rotas supervisor (não bloqueantes).
5. Página `/supervisor/integracoes` + item de menu.
6. Vitest: `shouldEmitIntegrations` + sign/verify.

## Security

Secrets só em env. Status API nunca retorna secret em claro.
