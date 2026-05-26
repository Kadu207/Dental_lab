# Dental Lab System Constitution

## Core Principles

### I. Spec-Driven Development (SDD)

Every capability MUST follow: constitution → specify → plan → tasks → implement. No production feature code without an approved spec in `specs/`. Features MUST be independently testable user stories with clear acceptance scenarios.

### II. Multi-Tenant Isolation

All database queries MUST scope by `clinica_id`. Cross-clinic data access is forbidden. Embedded and standalone modes share the same tenant model.

### III. RBAC in API and UI (NON-NEGOTIABLE)

All mutating and sensitive read routes MUST use `requirePolicy(resource, action)`. Permissions MUST be loaded via `enrichAuthPermissions`. Deny by default — never fallback to admin when permissions are missing. Frontend menu MUST filter by loaded permissions from `/auth/me`.

### IV. Test-First Discipline

Automated tests are mandatory for auth, RBAC, tenant isolation, prótese lifecycle, and label generation. No feature is done without passing tests. Smoke suite MUST pass before release.

### V. Dual-Mode Deployment

Every feature MUST work in **standalone** (own JWT login) and **embedded** (Excellence ERP iframe + shared Postgres). Test both paths when touching auth or routing.

### VI. Simplicity (YAGNI)

Prefer the simplest solution that meets the spec. No premature abstraction. Complexity MUST be justified in the plan artifact.

## Quality Gates

- Spec MUST pass requirements checklist before `/speckit-plan`
- Plan MUST pass constitution check before `/speckit-tasks`
- `/speckit-analyze` MUST report zero critical inconsistencies before `/speckit-implement`
- RBAC and tenant tests MUST pass before merging security-related changes

## Security & Compliance

- Secrets MUST never be committed; use environment variables
- Production MUST use strong JWT secret, DB credentials, and changed admin password
- Patient/lab data backups MUST NOT be in the repository
- CORS MUST be restricted in production via `DENTAL_LAB_CORS_ORIGINS`

## Development Workflow

1. Read `AGENTS.md` and active spec in `specs/` at session start
2. Execute Spec Kit phases in order for new features
3. Document specs and user-facing messages in Portuguese (pt-BR)
4. Monorepo layout: `apps/api`, `apps/web`, `packages/labels`

## Governance

This constitution supersedes ad-hoc practices. Amendments require updating this file, bumping the version semantically, and syncing dependent templates. All changes MUST verify compliance with principles I–VI.

**Version**: 1.0.0 | **Ratified**: 2026-05-24 | **Last Amended**: 2026-05-24
