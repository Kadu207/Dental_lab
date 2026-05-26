# Etapas do Projeto — Dental Lab System

> **Atualizado:** maio/2026 · reflete o código em `apps/api` v0.4.0, `apps/web` e integração com Excellence Dental.

## Visão geral

Sistema modular para **clínica odontológica + laboratório de próteses**, com pacote `@dental/labels` reutilizável. Pode rodar **standalone** (só o lab) ou **embedded** (aba no Excellence Dental Cloud).

**Onde estamos hoje:** **Fase 3 ~90%** (falta validação física na impressora), **Fase 5 ~70%** (KPIs, setores, CSV/HTML), **Fase 6 ~75%** (backup scripts, treinamento, UI colaboradores).

---

## FASE 1 — Etiquetas e Rastreio ✅ Concluída

**Objetivo:** Módulo de etiquetas com código de barras e impressão 3 vias.

| Item | Status |
|------|--------|
| Modelo de etiqueta (logo, paciente, telefone, amostra, data, barcode) | ✅ |
| Código único `PROT-AAAAMMDD-XXXX` | ✅ |
| Code128 (`bwip-js`) | ✅ |
| Impressão 3 vias (Laboratório, Clínica, Paciente) | ✅ |
| Leitor + fluxo de status | ✅ |
| Prévia `packages/labels/preview-etiqueta.html` | ✅ |

**Entregável:** `@dental/labels` integrável em qualquer projeto.

---

## FASE 2 — Cadastros Base ✅ Concluída

**Objetivo:** Operação interna do laboratório (API + interface).

| Item | Status |
|------|--------|
| CRUD clientes / fornecedores / estoque (movimentação) | ✅ |
| Registro de próteses + histórico de status | ✅ |
| **Empresa** (cadastro institucional + unidades) | ✅ |
| **Financeiro** (lançamentos, filtros, resumo) | ✅ |
| **Colaboradores** (CRUD + políticas JSON) | ✅ standalone |
| **Procedimentos** (valor, custo, % comissão) | ✅ |
| **Grupos e permissões** (RBAC + menu filtrado) | ✅ |
| API REST (Express) | ✅ |
| SQLite (dev) + Postgres (prod / embedded) | ✅ |
| Auth standalone + embedded + RBAC por recurso | ✅ |
| Dashboard básico (totais + alertas estoque) | ✅ |

**Entregável:** Sistema utilizável em dev e via Docker API+DB.

---

## FASE 3 — Configuração e Personalização 🔄 Em andamento (~75%)

**Objetivo:** Identidade visual e impressão na impressora real.

| Item | Status |
|------|--------|
| Nome, telefone e endereço do lab (`/api/config/lab`) | ✅ |
| Upload logo (base64 na config) | ✅ |
| Página **Etiquetas / Empresa** no front | ✅ |
| Tabela dos 7 campos da etiqueta | ✅ |
| Tamanhos suportados na API (`termica_100x50`, `50x30`, `a4`) | ✅ |
| Seletor de tamanho na UI (Próteses / Config) | ✅ |
| Etiqueta de teste na UI + `print-test.ps1` | ✅ |
| Ajuste fino CSS `@page` na impressora térmica real | 🔜 validação manual (com você) |
| Logo em object storage (em vez de base64 no DB) | 🔜 |
| Campos extras na etiqueta | 🔜 sob demanda |

**Próximo passo:** testar impressão 100×50 mm na impressora escolhida (ver `PRODUCAO-CHECKLIST.md`).

---

## FASE 4 — Integração com Excellence Dental 🔄 Infra pronta, negócio pendente

**Objetivo:** Mesmo ecossistema clínica + laboratório.

| Item | Status |
|------|--------|
| Proxy BFF `/lab-api/*` no FastAPI do Excellence | ✅ no ERP |
| Rota `/dashboard/laboratorio` + iframe `/lab/` | ✅ no ERP |
| `lab-api` + `lab-web` no `docker-compose.prod.yml` (profile `lab`) | ✅ no ERP |
| Smoke script `smoke-lab-embedded.ps1` | ✅ no ERP |
| Schema `dental_lab` no Postgres do ERP | ✅ na API |
| Sessão iframe (`?embedded=1` + `localStorage` ERP) | ✅ |
| Ativar `LAB_MODULE_ENABLED` + chave de licença em produção | 🔜 operação |
| Sincronizar pacientes clínica ↔ laboratório | 🔜 |
| Enviar trabalho protético a partir da ficha do paciente (ERP) | 🔜 |
| Consultar status do trabalho na clínica sem abrir o lab | 🔜 |

**Checklist detalhado:** [`EXCELLENCE-FASE4.md`](./EXCELLENCE-FASE4.md)

---

## FASE 5 — Produção Avançada 🔄 Em andamento (~70%)

| Item | Status |
|------|--------|
| KPIs (atrasos, produção do dia, gráfico por status) | ✅ `/api/dashboard/kpis` + Dashboard |
| Ordem por setor (gesso, cerâmica, acabamento) | ✅ coluna `setor` + página Setores |
| Notificações (pronto, estoque baixo) | ✅ alertas no Dashboard |
| Relatórios PDF/Excel | ✅ CSV + HTML imprimível |
| Consumo de matéria-prima por trabalho | 🔜 |

---

## FASE 6 — Deploy e Uso em Produção 🔄 Em andamento (~75%)

| Item | Status |
|------|--------|
| Docker standalone (Postgres + API + **web com gateway**) | ✅ `docker-compose.standalone.yml` |
| Docker embedded (API no Postgres do ERP) | ✅ `docker-compose.embedded.yml` |
| Deploy Hetzner (scripts no Excellence) | ✅ documentado |
| Licença do módulo (`DENTAL_LAB_LICENSE_*`) | ✅ código |
| Smoke automatizado standalone | ✅ `infra/ops/smoke-standalone.ps1` |
| Backup automático do banco | ✅ `backup-standalone.ps1` + retenção |
| Restore documentado | ✅ `restore-standalone.ps1` |
| Gestão de usuários na UI (além do `admin`) | ✅ Colaboradores (standalone) |
| Treinamento da equipe | ✅ `TREINAMENTO-EQUIPE.md` |
| Impressora térmica validada em campo | 🔜 com você (checklist físico) |

**Checklist operacional:** [`PRODUCAO-CHECKLIST.md`](./PRODUCAO-CHECKLIST.md)

---

## Arquitetura atual

```
dental-lab-system/
├── packages/labels/          @dental/labels
├── apps/api/                 Express — v0.4.0
├── apps/web/                 React + Vite
├── docker-compose.standalone.yml   Postgres + API + Web (porta 8080)
├── docker-compose.embedded.yml     API → Postgres do ERP
├── INTEGRATION.md            Modos standalone / embedded
├── EXCELLENCE-FASE4.md       O que falta no Excellence
└── PRODUCAO-CHECKLIST.md     Testes, backup, impressora
```

---

## Comandos rápidos

**Desenvolvimento (dois terminais):**
```bash
npm run dev:api    # http://localhost:3333
npm run dev:web    # http://localhost:5173
```

**Standalone Docker (stack completa):**
```bash
docker compose -f docker-compose.standalone.yml up -d --build
# UI: http://localhost:9180  — login admin / admin123 (trocar em produção)
```

**Smoke standalone (após o compose):**
```powershell
pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180
```

---

## Próximos passos recomendados (ordem)

1. Subir `docker-compose.standalone.yml` e rodar smoke.  
2. Validar impressão 100×50 mm na impressora (checklist produção).  
3. No Excellence: seguir `EXCELLENCE-FASE4.md` e `infra/LAB_MODULE_READY.md`.  
4. Fase 5 conforme prioridade de negócio (KPIs, relatórios).
