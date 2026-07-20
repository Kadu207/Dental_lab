# Checklist — Onda 3 / 012 Integrações

- [ ] `GET /api/integracoes/status` (supervisor) sem expor secrets
- [ ] Com `INTEGRATIONS_ENABLED=false`, disparo manual retorna 503
- [ ] Com enabled + URL, disparo N8N não derruba a API
- [ ] Create tenant emite `tenant_onboarded` (se enabled; ver logs/N8N)
- [ ] Suspender emite `tenant_suspended`
- [ ] Gerar licença emite `licenca_gerada`
- [ ] `POST /api/webhooks/n8n` sem secret → 401; com secret → 200
- [ ] Embedded sem force: `willEmit=false`
- [ ] UI `/supervisor/integracoes` carrega
- [ ] `npm test` em apps/api (HMAC)
