---
name: dental-lab-domain
description: Domain knowledge for Dental Lab System — prótese lifecycle, setores, 3-via labels, RBAC perfis, and @dental/labels package. Use when implementing lab features, status flows, or business rules.
---

# Dental Lab Domain

## Prótese Status Flow

```
recebido → em_producao → prova → acabamento → pronto → entregue
```

Scanner advances to next status automatically.

## Setores (production)

gesso, ceramica, acrilico, acabamento, expedicao — filter próteses via `?setor=`

## Labels (`@dental/labels`)

- Code format: `PROT-AAAAMMDD-XXXX`
- 3 vias: Laboratório (blue), Clínica (green), Paciente (purple)
- Sizes: `termica_100x50`, `termica_50x30`, `a4`
- Package: `packages/labels`

## RBAC Perfis

admin, gestor, recepcao, laboratorio, colaborador, estagiario

Policies in `apps/api/src/auth/rbac.ts` → `DEFAULT_POLICIES`

Resources: clientes, fornecedores, estoque, proteses, config, empresa, financeiro, procedimentos, grupos, colaboradores

## Core Entities

- **clientes** — patients
- **proteses** — orders with barcode tracking
- **estoque** — inventory with min-stock alerts
- **empresa** — institutional data + unidades
- **financeiro** — financial entries
- **procedimentos** — procedures with commission
