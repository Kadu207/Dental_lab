# Checklist de validação — Onda 1 (006 UI responsiva)

**Status:** aguardando validação humana  
**Sem build de produção** até você confirmar.

## Como validar (dev)

```powershell
cd "c:\Projetos DEV\dental-lab-system"
npm run dev:web
```

Abra o app e use DevTools → Toggle device toolbar.

## Viewports

| Viewport | Menu drawer | Sidebar desktop | Tabelas scroll | Forms 1 col |
|----------|-------------|-----------------|----------------|-------------|
| 375px | [ ] hamburger abre/fecha; backdrop; Escape; NavLink fecha | N/A | [ ] pacientes/próteses/financeiro/estoque | [ ] |
| 768px | [ ] drawer ok | N/A / limite | [ ] | [ ] |
| 1280px | [ ] sem topbar hamburger | [ ] sidebar fixa 260px | [ ] normal | [ ] grid ok |

## Rotas mínimas

- [ ] Login
- [ ] Dashboard `/`
- [ ] Pacientes `/clientes`
- [ ] Próteses `/proteses`
- [ ] Financeiro `/financeiro`
- [ ] Embedded (se possível): iframe estreito / `?embedded=1`

## Resultado

- [ ] **Aprovado** — avançar para Onda 2 (`007`+`008`)
- [ ] **Ajustes necessários:** (descrever)

Quando aprovar, responda: `onda 1 validada` ou `aprovado — onda 2`.
