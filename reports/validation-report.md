# Validation Report — dental-lab-system

**Data:** 2026-06-23
**Fase:** QA / validação (Claude Code)
**Status:** ✅ APPROVED — sem bloqueios críticos

## Testes (vitest)

| Workspace | Resultado |
|-----------|-----------|
| `@dental/labels` | ✅ 2/2 |
| `@dental/api` | ✅ 14/14 (rbac 12, license 2) |
| **Total** | **✅ 16/16** |

## Build

| Alvo | Resultado |
|------|-----------|
| `@dental/labels` (tsc) | ✅ |
| `@dental/api` (tsc) | ✅ |
| `@dental/web` (Vite) | não executado nesta sessão (requer env) |

`@dental/web` não possui testes unitários.

## Segurança / LGPD

- Nenhum `.env`/`.db`/`.sqlite` versionado (varredura limpa).
- `.gitignore` cobre `.env` e `.env.*`.

## Regras de negócio

Suíte verde e builds ok — nada incompleto a implementar nesta fase (não foram inventadas regras).

## Não executado (requer infra/env)

- `smoke:standalone` (PowerShell + docker standalone)
- build do `@dental/web`
- e2e

## ⚠️ Observação de repositório

Existem **dois repos GitHub** para este projeto: `Kadu207/Dental_lab` (canônico, em sincronia com o local) e `Kadu207/Dental-Lab` (**24 commits atrás**, duplicado defasado). Recomenda-se consolidar em um só para evitar confusão.

## Recomendação

✅ Sem bloqueios. Ambiente toolchain: node v24.17, npm 11.13.
