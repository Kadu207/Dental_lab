## Spec-Driven Development

Use Spec Kit skills in `.cursor/skills/speckit-*`. Active specs live in `specs/`. Constitution: `.specify/memory/constitution.md`.

Workflow: `/speckit-specify` → `/speckit-clarify?` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → checklist

**TDD:** test tasks before implementation tasks. **EDD:** Given/When/Then in specs + domain events (N8N/Chatwoot/CAM).

Roadmap: `docs/ROADMAP-EVOLUCAO.md`. Ordem aprovada (2026-07-19): `006` → `007`/`008` → `011`/`012` → **`010` CAM (pasta paciente + SDKs)** → **`009` financeiro**.

## Agent orchestration

Lead agent may run parallel `explore` subagents, then Spec Kit + domain skills (`dental-lab-domain`, `dental-lab-integration`, `dental-lab-api-patterns`). One spec per MR. Dual-mode (standalone + embedded) required for auth/routing/header changes. No product `docker`/`npm` build until the user authorizes the code phase after docs.
