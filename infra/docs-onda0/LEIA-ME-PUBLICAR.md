# LEIA-ME — Onda 0

## Status

Documentos canônicos **já publicados** em `docs/` (hard link a partir de `infra/docs-onda0/`):

- `docs/ROADMAP-EVOLUCAO.md`
- `docs/CAM-CONNECTOR.md`
- `docs/INTEGRACOES-CHATWOOT-N8N.md`

Patches aplicados em: `AGENTS.md`, `README.md`, `ETAPAS-DO-PROJETO.md`, `docs/DOCUMENTACAO.md`, `docs/DEPLOY-VPS-PASSO-A-PASSO.md`.

## Revalidar / republicar (sem Admin)

```powershell
cd "c:\Projetos DEV\dental-lab-system"
powershell -ExecutionPolicy Bypass -File infra\docs-onda0\publish-onda0.ps1
```

## Sequência aprovada

Onda 0 (docs) → validar → Onda 1 (006) → … → 010 CAM → 009 financeiro.

Gate para código: `aprovado — docs e depois código`
