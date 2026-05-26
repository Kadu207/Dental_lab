---
name: dental-lab-integration
description: Excellence Dental embedded integration — iframe, ERP JWT, BFF proxy /lab-api/, X-Clinica-Id header, licensing. Use when working on embedded mode or ERP sync.
---

# Dental Lab Integration

## Modes

| Mode | Env | Auth |
|------|-----|------|
| standalone | `DENTAL_LAB_DEPLOYMENT_MODE=standalone` | `/api/auth/login` → JWT |
| embedded | `DENTAL_LAB_DEPLOYMENT_MODE=embedded` | ERP session token as Bearer |

## Embedded Frontend

- `IS_EMBEDDED` in `apps/web/src/lib/auth.ts`
- API base: `/lab-api` (BFF proxy in Excellence FastAPI)
- Headers: `Authorization: Bearer <erp-token>`, `X-Clinica-Id: <id>`

## Embedded Backend

- `resolveEmbeddedAuth()` in `apps/api/src/auth/embedded.ts`
- License gate may be bypassed without `X-Dental-Lab-License` in embedded
- ERP patient sync: `POST /api/clientes/sync-erp`

## Licensing

- Header: `X-Dental-Lab-License`
- Tables: `product_licenses`
- UI: `LicenseBanner`, `LicencaLabSection`

## Reference

See `INTEGRATION.md` and `EXCELLENCE-FASE4.md` in project root.
