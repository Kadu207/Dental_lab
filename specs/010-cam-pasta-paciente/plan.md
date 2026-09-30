# Plan: 010 CAM pasta + registry

## Slice desta onda

010.1 + 010.2 + 010.3 (filesystem + perfis stub). Sem agente SDCP.

## Layout

- `apps/api/src/cam/` — types, registry, filesystem adapter, storage paths, jobs service
- Rotas: `apps/api/src/cam/routes.ts` montadas em `/api/pacientes` pasta + `/api/cam`
- Schema em `init.ts` + `schema-postgres.sql` + `provision.ts`
- Web: seção em `PacienteFicha` (+ hardlink infra se High IL)
- Upload: `application/octet-stream` + headers (sem multer)

## Testes

Vitest: checksum path sanitize + registry lista adapters.
