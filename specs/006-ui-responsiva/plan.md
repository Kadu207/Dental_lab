# Implementation Plan: UI responsiva (drawer mobile)

**Branch**: `006-ui-responsiva` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

## Summary

Substituir sidebar full-width no mobile por **top bar + drawer off-canvas** em `App.tsx` / `index.css`, com backdrop, Escape e fechamento ao navegar. Melhorar overflow de tabelas. Sem mudança de API.

## Technical Context

**Language/Version**: TypeScript / React 19  
**Primary Dependencies**: React Router 7, CSS global (`apps/web/src/index.css`)  
**Storage**: N/A  
**Testing**: Checklist manual viewports + smoke visual; Vitest no web se já houver harness (senão checklist EDD)  
**Target Platform**: Browser mobile/desktop; iframe embedded  
**Project Type**: web SPA (`apps/web`)  
**Constraints**: Sem nova lib UI; dual-mode; YAGNI  
**Scale/Scope**: Shell + CSS global; páginas CRUD herdando classes existentes

## Constitution Check

- SDD: spec/plan/tasks presentes  
- Dual-mode: testar standalone + embedded  
- RBAC: inalterado (só layout)  
- TDD: checklist de aceite + tarefas de validação antes de marcar done  

## Project Structure

```text
specs/006-ui-responsiva/
├── spec.md
├── plan.md
└── tasks.md

apps/web/src/
├── App.tsx                 # state drawer + top bar
├── components/ui/Icons.tsx # IconMenu / IconClose
└── index.css               # media queries drawer + table-wrap
```

## Design

### Breakpoint

- `max-width: 768px` → mobile shell  
- `min-width: 769px` → sidebar fixa (comportamento atual)

### Estado React

```ts
const [navOpen, setNavOpen] = useState(false);
```

- Abrir: hamburger  
- Fechar: backdrop, Escape, `NavLink` onClick, resize ≥769  

### CSS

- `.topbar` fixa no mobile  
- `.sidebar` `position: fixed; transform: translateX(-100%)` → `.sidebar.is-open { transform: none }`  
- `.nav-backdrop`  
- `.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }`  

## Implementation approach

1. Ícones menu/close  
2. AppShell: topbar + state + handlers  
3. CSS mobile override (substituir regra que só faz `sidebar { width: 100% }`)  
4. Validar viewports  

## Risks

- z-index overlay vs LicenseBanner — sidebar acima do main  
- Embedded: topbar não deve conflitar com chrome do ERP  
