# Feature Specification: UI responsiva (drawer mobile)

**Feature Branch**: `006-ui-responsiva`  
**Created**: 2026-07-20  
**Status**: In Progress  
**Input**: Onda 1 do roadmap — app 100% usável em smartphone/tablet; dual-mode standalone + embedded

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação mobile com drawer (Priority: P1)

Colaborador no celular abre o Lab e acessa o menu via botão hamburger; o drawer abre/fecha sem ocupar a tela inteira permanentemente; ao escolher um item, o menu fecha.

**Why this priority**: Sem drawer, a sidebar 100% de largura em mobile torna a UI inutilizável.

**Independent Test**: Em viewport ≤768px, hamburger visível; clique abre overlay + sidebar; Escape ou backdrop fecha; NavLink fecha o drawer.

**Acceptance Scenarios**:

1. **Given** viewport 375px e usuário autenticado, **When** a shell carrega, **Then** vê top bar com hamburger e a sidebar não ocupa o fluxo principal (off-canvas).
2. **Given** drawer fechado, **When** toca no hamburger, **Then** sidebar desliza e backdrop escurece o conteúdo.
3. **Given** drawer aberto, **When** escolhe um item do menu, **Then** navega e o drawer fecha.
4. **Given** drawer aberto, **When** toca no backdrop ou pressiona Escape, **Then** o drawer fecha.

---

### User Story 2 - Listagens e formulários usáveis no mobile (Priority: P2)

Nas páginas CRUD principais (pacientes, próteses, financeiro, estoque), tabelas não quebram o layout; formulários ficam em coluna única.

**Why this priority**: Operação diária no lab/clínica usa essas telas.

**Independent Test**: Viewport 375px nas rotas `/clientes`, `/proteses`, `/financeiro`, `/estoque` — scroll horizontal em tabelas ou layout empilhado; forms em 1 coluna.

**Acceptance Scenarios**:

1. **Given** viewport 375px em página com `.table-wrap` / tabela, **When** a página renderiza, **Then** a tabela é scrollável horizontalmente sem estourar a viewport.
2. **Given** viewport 375px, **When** abre formulário com `.form-grid`, **Then** campos empilham em uma coluna.
3. **Given** viewport 1280px, **When** usa o app, **Then** sidebar fixa permanece como hoje (sem regressão desktop).

---

### User Story 3 - Dual-mode embedded (Priority: P3)

No iframe Excellence (`embedded=1`), o hamburger/drawer funciona na largura estreita do iframe; badge “Modo integrado” permanece legível.

**Why this priority**: Constituição dual-mode.

**Independent Test**: `?embedded=1` (ou build embedded) em largura ~400px — drawer funciona; logout oculto se já for o comportamento atual.

**Acceptance Scenarios**:

1. **Given** modo embedded e viewport estreita, **When** abre o menu, **Then** drawer funciona igual ao standalone (exceto itens `standaloneOnly`).

---

### Edge Cases

- Redimensionar de mobile → desktop: drawer fecha e sidebar volta fixa.
- Foco: botão hamburger tem `aria-expanded` e `aria-controls`.
- Supervisor MASTER: mesmo padrão de drawer no console.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Em `max-width: 768px`, layout usa top bar + sidebar off-canvas (drawer), não sidebar empilhada full-width permanente.
- **FR-002**: Botão hamburger na top bar mobile; ícones acessíveis.
- **FR-003**: Backdrop e Escape fecham o drawer.
- **FR-004**: Navegação por `NavLink` fecha o drawer após clique.
- **FR-005**: Desktop (≥769px) mantém sidebar fixa 260px sem top bar hamburger.
- **FR-006**: Tabelas em containers com `overflow-x: auto` no mobile.
- **FR-007**: Funciona em standalone e embedded.

### Non-Functional

- Sem novas dependências de UI library (CSS + React state).
- Sem `docker`/`npm run build` de produção nesta entrega até validação da onda (dev `vite` ok para validar).
- Texto UI em pt-BR (`aria-label`: “Abrir menu”, “Fechar menu”).

## Success Criteria *(mandatory)*

- Checklist visual viewports **375 / 768 / 1280** nas rotas do menu principal.
- Nenhum regressão óbvia no desktop.
- Dual-mode: shell responsiva em iframe estreito.
