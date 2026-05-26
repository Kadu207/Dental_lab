# AGENTS.md — Dental Lab System

## Project

Monorepo npm for dental laboratory management. Standalone or embedded in Excellence Dental Cloud.

| Package | Path | Stack |
|---------|------|-------|
| API | `apps/api` | Express 4, TypeScript, SQLite (dev) / Postgres (prod) |
| Web | `apps/web` | React 19, Vite 6, React Router 7 |
| Labels | `packages/labels` | 3-via barcode labels (`@dental/labels`) |

## Spec-Driven Development

Use Spec Kit skills in `.cursor/skills/speckit-*`. Active specs live in `specs/`. Constitution: `.specify/memory/constitution.md`.

Workflow: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`

## Domain Skills

- `dental-lab-domain` — prótese status flow, setores, labels, RBAC perfis
- `dental-lab-integration` — embedded mode, ERP proxy, licensing
- `dental-lab-api-patterns` — Express conventions, `withLabClient`, `requirePolicy`

## External Skills (reference only)

- `api-security-best-practices`
- `supabase-postgres-best-practices`
- `nodejs-backend-patterns`
- `clean-code`

## Key Conventions

- Multi-tenant: always filter by `clinica_id`
- RBAC: `requirePolicy("resource", "read"|"write"|"delete")` on routes
- Auth middleware loads permissions via `enrichAuthPermissions`
- API errors: `{ erro: string, code?: string }`
- User-facing text: Portuguese (pt-BR)

## Deployment Modes

- **standalone**: `DENTAL_LAB_DEPLOYMENT_MODE=standalone`, own login, Docker Compose with Postgres
- **embedded**: iframe in Excellence, ERP JWT, BFF `/lab-api/`, header `X-Clinica-Id`

## Docs Reference

- `INTEGRATION.md` — deployment modes
- `PRODUCAO-CHECKLIST.md` — production validation
- `EXCELLENCE-FASE4.md` — ERP integration checklist
