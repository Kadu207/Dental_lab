# Export Lovable — integração 2026-06-03

Pasta de origem: `lovable-project-cdbe07a1-…-2026-06-03` (TanStack Start + Tailwind + shadcn).

## Não copiado (quebraria o pipeline Docker/npm)

- `package.json` / `bun.lock` / `bunfig.toml` do export (stack Bun + TanStack Start)
- `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json`
- `src/routes/**` (file routes TanStack)
- `src/routes/api/proxy.$.ts` (proxy Cloudflare)
- `src/components/ui/**` (shadcn — 50+ componentes Radix)
- `.lovable` (metadados do builder)

## Portado para `apps/web` (React Router + CSS do monorepo)

| Origem Lovable | Destino monorepo |
|----------------|------------------|
| `lib/odontograma.ts` | `apps/web/src/lib/odontograma.ts` |
| `lib/odontogramaHistory.ts` | `apps/web/src/lib/odontogramaHistory.ts` |
| `lib/odontogramaPdf.ts` | `apps/web/src/lib/odontogramaPdf.ts` |
| `lib/pagination.ts` | `apps/web/src/lib/pagination.ts` |
| `components/odontograma/DentalArch3D.tsx` | `apps/web/src/components/odontograma/` |
| `routes/_authenticated/odontograma.tsx` | `apps/web/src/pages/Odontograma.tsx` |
| `routes/_authenticated/sem-acesso.tsx` | `apps/web/src/pages/SemAcesso.tsx` |
| `hooks/usePermissions.ts` | `apps/web/src/hooks/usePermissions.ts` |
| `components/PermissionGate.tsx` | `apps/web/src/components/PermissionGate.tsx` |

API: alias `api.pacientes.list` → `/api/clientes` (já existia alias `/api/pacientes` na API).

## Deploy

```bash
cd /opt/dental-lab-system && bash infra/ops/redeploy-vps.sh
```

Confirme `HEAD` com commit posterior a `a46ddcc` após push desta integração.
