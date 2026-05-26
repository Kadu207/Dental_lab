# Plan: Estabilização e Segurança

## Technical Approach

1. `auth.ts`: call `enrichAuthPermissions` after token resolution
2. `rbac.ts`: use `parsePermissoes(null, perfil)` instead of admin fallback
3. `routes/helpers.ts`: shared `getClinicaId`
4. Add `requirePolicy` to core routers + config/etiquetas in index.ts
5. `middleware/errorHandler.ts`: catch async errors
6. `lib/downloadWithAuth.ts`: fetch+blob for print/CSV

## Files

- `apps/api/src/middleware/auth.ts`
- `apps/api/src/auth/rbac.ts`
- `apps/api/src/routes/*.ts`
- `apps/api/src/index.ts`
- `apps/web/src/lib/downloadWithAuth.ts`
- Pages: Proteses, Relatorios, Configuracao, Scanner
