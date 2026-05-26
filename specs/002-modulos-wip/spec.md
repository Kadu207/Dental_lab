# Feature Specification: Módulos WIP Completos

**Feature Branch**: `002-modulos-wip`  
**Created**: 2026-05-24  
**Status**: Approved

## User Stories

### P1 — CRUD Empresa/Financeiro/Procedimentos/Grupos via UI standalone

**Given** admin logado, **When** acessa /empresa, /financeiro, etc., **Then** CRUD funciona end-to-end.

### P1 — Menu filtrado por RBAC

**Given** estagiario, **When** carrega app, **Then** menu oculta rotas sem permissão read.

## Requirements

- Schema WIP em SQLite + Postgres
- Rotas montadas em index.ts
- api.ts + App.tsx integrados
- qualify() para novas tabelas Postgres
