# Feature Specification: Estabilização e Segurança

**Feature Branch**: `001-estabilizacao-seguranca`  
**Created**: 2026-05-24  
**Status**: Approved

## User Stories

### P1 — RBAC funcional na API

**Given** usuário estagiario autenticado, **When** DELETE /api/clientes/:id, **Then** 403 FORBIDDEN.

### P1 — Permissões carregadas no auth

**Given** login standalone, **When** qualquer rota protegida, **Then** `req.auth.permissoes` preenchido via enrich.

### P1 — Downloads autenticados

**Given** auth ativa, **When** imprimir etiqueta ou CSV, **Then** download funciona com Bearer token.

## Requirements

- Wire `enrichAuthPermissions` in auth middleware
- `requirePolicy` on all resource routes
- Deny-by-default RBAC (perfil-based fallback, not admin)
- `downloadWithAuth` helper in frontend
- Global Express error handler
- Hardened `.gitignore`, remove SQL backups from repo
