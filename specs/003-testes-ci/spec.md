# Feature Specification: Testes e CI

**Feature Branch**: `003-testes-ci`  
**Created**: 2026-05-24  
**Status**: Approved

## User Stories

### P1 — RBAC testado automaticamente

**Given** perfil estagiario, **When** testes rodam, **Then** deny delete clientes confirmado.

### P1 — npm test no root

**Given** CI local, **When** `npm test`, **Then** suite passa.

## Requirements

- Vitest em apps/api
- Casos: RBAC, parsePermissoes, labels code format
- Script npm test no root
