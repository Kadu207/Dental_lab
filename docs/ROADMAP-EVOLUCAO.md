# Roadmap de evolução — Dental Lab System

> **Aprovado:** 2026-07-19 · **Status:** Ondas 0–5 **concluídas** (006→009 + 010.1–010.3). Pendente opcional: **010.4+**. **Build/deploy de produção liberado** (2026-07-20).

Documento canônico do roadmap. Detalhes de CAM: [CAM-CONNECTOR.md](./CAM-CONNECTOR.md). Integrações CRM: [INTEGRACOES-CHATWOOT-N8N.md](./INTEGRACOES-CHATWOOT-N8N.md).

## Metodologia (obrigatória)

| Prática | Como |
|---------|------|
| **SDD + Spec Kit** | `/speckit-specify` → clarify? → plan → tasks → analyze → implement → checklist |
| **TDD** | Testes (Vitest/RBAC/tenant/smoke) antes do código da feature em `tasks.md` |
| **EDD** | Specs Given/When/Then + eventos de domínio (N8N/Chatwoot/CAM) |
| **Agentes** | Lead + explore paralelo + skills `speckit-*` / `dental-lab-*`; uma spec por MR |

Constituição: `.specify/memory/constitution.md` · Skills: `.cursor/skills/` · Specs: `specs/`.

## Ordem das ondas (código)

Aprovado com **CAM antes do financeiro**:

| Ordem | Spec | Tema | Status |
|-------|------|------|--------|
| 1 | `006-ui-responsiva` | Drawer mobile, CRUD usável 375/768/1280, dual-mode | Validada |
| 2 | `007` + `008` | Pacientes (busca/ficha) + Excellence Fase 4 negócio | Validada |
| 3 | `011` + `012` | Empresas (paridade Excellence) + Chatwoot/N8N | Validada |
| 4 | `010` (+ `010b`) | **Pasta digital do paciente + Scanner→Elegoo/fresadoras + registry SDKs** | Validada (010.1–010.3); 010.4+ opcional |
| 5 | `009` | Financeiro operacional (depois do CAM) | Validada |

## Gates

1. Plano aprovado (feito)
2. Onda 0 docs (feito)
3. Autorização humana para código (feito por onda)
4. Spec da onda aprovada + implement → **só então** build/deploy (**liberado** 2026-07-20)

## Fora de escopo imediato

Redesign visual completo · PIX/boleto/NF-e · app nativo · rehost Chatwoot/N8N

## Referências

- [ETAPAS-DO-PROJETO.md](../ETAPAS-DO-PROJETO.md)
- [EXCELLENCE-FASE4.md](../EXCELLENCE-FASE4.md)
- [INTEGRATION.md](../INTEGRATION.md)
- [AGENTS.md](../AGENTS.md)
