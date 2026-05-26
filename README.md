# Dental Lab System — Clínica & Laboratório

**Produto independente** de laboratório (próteses, estoque, etiquetas). Pode rodar **sozinho** ou, com licença, ser integrado ao **Excellence Dental Cloud** via iframe (`INTEGRATION.md`).

| Modo | Como subir |
|------|------------|
| **Standalone** (padrão) | `docker compose -f docker-compose.standalone.yml up -d --build` |
| **Embedded no ERP** | Excellence: `docker-compose.lab-module.yml` + `LAB_MODULE_ENABLED` + licença |

Sistema modular para gestão de clínica odontológica e laboratório de próteses.

## Estrutura

```
dental-lab-system/
├── packages/labels/     ← @dental/labels (módulo reutilizável de etiquetas)
├── apps/api/            ← API REST (SQLite dev / Postgres prod)
├── apps/web/            ← Interface web (React)
├── .specify/            ← Spec Kit (SDD)
├── specs/               ← Feature specs
└── .cursor/skills/      ← Agent skills
```

## Funcionalidades

- **Clientes/Pacientes** — cadastro completo
- **Fornecedores** — cadastro completo
- **Estoque** — matéria-prima com alertas de estoque mínimo
- **Próteses** — registro com código de barras único
- **Etiquetas 3 vias** — impressão profissional (laboratório, clínica, paciente)
- **Leitor de código de barras** — rastreio de status no laboratório

## Modelo de Etiqueta — 3 Vias

| Via | Cor | Conteúdo |
|-----|-----|----------|
| **1 — Laboratório** | Azul | Controle interno: paciente, dentista, trabalho, material, status, obs. |
| **2 — Clínica** | Verde | Identificação para o dentista: paciente, trabalho, dentes, cor, previsão |
| **3 — Paciente** | Roxo | Embalagem/entrega: paciente, trabalho, dentista, código de barras |

Tamanhos suportados: `termica_100x50`, `termica_50x30`, `a4`

## Instalação

```bash
cd dental-lab-system
npm install
```

Copie os exemplos de ambiente:

- `apps/api/.env.example` → `apps/api/.env` (opcional em dev)
- `apps/web/.env.example` → `apps/web/.env` (opcional em dev)
- `.env.standalone.example` → `.env` (Docker standalone)

## Executar

### Desenvolvimento (dois terminais — recomendado no Windows)

Terminal 1 — API:
```bash
npm run dev:api
```

Terminal 2 — Interface:
```bash
npm run dev:web
```

Acesse: **http://localhost:5173** · login padrão standalone: `admin` / `admin123`

### Standalone Docker (API + Postgres + Web)

```bash
docker compose -f docker-compose.standalone.yml up -d --build
```

Acesse: **http://localhost:9180** (ou a porta definida em `LAB_WEB_PORT` no `.env`).

> **Atenção:** a porta **8080** nesta máquina costuma ser o **Excellence Dental** (ERP), não o Dental Lab standalone. Use **9180** para o menu e telas do laboratório.

Validação automatizada:

```powershell
pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180
```

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [ETAPAS-DO-PROJETO.md](./ETAPAS-DO-PROJETO.md) | Fases e status real |
| [INTEGRATION.md](./INTEGRATION.md) | Standalone vs embedded |
| [EXCELLENCE-FASE4.md](./EXCELLENCE-FASE4.md) | Checklist integração Excellence |
| [PRODUCAO-CHECKLIST.md](./PRODUCAO-CHECKLIST.md) | Testes, backup, impressora |

## Licença, CORS e modo standalone/embedded

- Variáveis: ver `apps/api/.env.example` e **[INTEGRATION.md](./INTEGRATION.md)** para acoplar ao Excellence Dental (proxy, banco).
- Com `DENTAL_LAB_LICENSE_REQUIRED=true`, o front pode usar `VITE_DENTAL_LAB_LICENSE_KEY` **apenas em dev**; em produção prefira proxy que injeta `X-Dental-Lab-License`.

## Fluxo de uso

1. Cadastre **clientes** e **fornecedores**
2. Cadastre **estoque** (matéria-prima)
3. Registre uma **prótese** → gera código `PROT-AAAAMMDD-XXXX` + código de barras
4. Clique **Imprimir 3 vias** → abre página de impressão
5. Use o **Leitor de Código de Barras** para escanear e avançar status:
   `Recebido → Em Produção → Prova → Acabamento → Pronto → Entregue`

## Integração em outro projeto

O pacote `@dental/labels` é independente:

```typescript
import {
  criarRegistroProtese,
  gerarEtiquetas3Vias,
  renderHtmlImpressao,
} from "@dental/labels";
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Saúde + modo implantação |
| GET | `/api/license/status` | Metadado de licença (sem segredo) |
| GET/POST | `/api/clientes` | CRUD clientes |
| GET/POST | `/api/fornecedores` | CRUD fornecedores |
| GET/POST | `/api/estoque` | CRUD estoque |
| GET/POST | `/api/proteses` | Registro de próteses |
| GET | `/api/proteses/:id/imprimir` | HTML 3 vias |
| POST | `/api/scanner/scan` | Leitor de código de barras |
