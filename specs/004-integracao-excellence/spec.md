# Feature Specification: Integração Excellence + Produção

**Feature Branch**: `004-integracao-excellence`  
**Created**: 2026-05-24  
**Status**: Approved

## User Stories

### P1 — Paginação em listagens

**Given** muitos clientes, **When** GET /api/clientes?limit=50&offset=0, **Then** resposta paginada.

### P2 — Migrations versionadas

**Given** upgrade de schema, **When** deploy, **Then** migration SQL aplicável documentada.

## Requirements

- Referência EXCELLENCE-FASE4.md e PRODUCAO-CHECKLIST.md
- Paginação opcional limit/offset em clientes e proteses
- Migration script em .specify/migrations/
- Documentar env vars obrigatórias em prod (.env.example)
