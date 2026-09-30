# Roadmap de evolução — Dental Lab System

> **Aprovado:** 2026-07-19 · **Status:** Ondas 0–5 **concluídas** (006→009 + 010.1–010.3).  
> **Spec 010b** (registry CamAdapter / SDCP / slots) criada em 2026-09-30 — implementação 010.4+ pendente.  
> **Build/deploy de produção liberado** (2026-07-20). Produção alinhada a `master` (ex.: deploy 2026-09-30).

Documento canônico do roadmap. Detalhes de CAM: [CAM-CONNECTOR.md](./CAM-CONNECTOR.md). Integrações CRM: [INTEGRACOES-CHATWOOT-N8N.md](./INTEGRACOES-CHATWOOT-N8N.md). Busca e webhooks: [DB-MIGRACAO-E-HARDENING.md](./DB-MIGRACAO-E-HARDENING.md). Deploy: [DEPLOY-VPS-PASSO-A-PASSO.md](./DEPLOY-VPS-PASSO-A-PASSO.md).

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
| 4 | `010` (+ `010b`) | **Pasta digital do paciente + Scanner→Elegoo/fresadoras + registry SDKs** | 010.1–010.3 validadas; **010b spec Draft** (010.4–010.6) |
| 5 | `009` | Financeiro operacional (depois do CAM) | Validada |

### Specs CAM

| Spec | Pasta | Escopo |
|------|-------|--------|
| `010` | `specs/010-cam-pasta-paciente/` | Pasta digital, anexos, registry piloto filesystem/hot folder |
| `010b` | `specs/010b-cam-adapter-registry/` | Registry pleno, Elegoo Link/SDCP + agente LAN, slots Medit/Shining/3Shape/fresadoras, eventos EDD opcionais |

Próximo passo 010b: `/speckit.plan` → tasks → authorize implement (TDD).

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
