---
name: dental-lab-api-patterns
description: Express API conventions for Dental Lab — withLabClient, requirePolicy, clinicaId helper, mappers, error shape. Use when adding or modifying API routes.
---

# Dental Lab API Patterns

## Route Structure

```typescript
import { Router, type Request } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { getClinicaId } from "./helpers.js";

export const fooRouter = Router();

fooRouter.get("/", requirePolicy("resource", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    // ...
  });
});
```

## Database

- Always use `withLabClient(clinicaId, fn)` — never raw pool without tenant scope
- Postgres: tables qualified via `LabDbClient.qualify()`
- IDs: `newId()` from `apps/api/src/db/index.ts`

## Auth Pipeline

1. `licenseGate` → 2. `authGate` (calls `enrichAuthPermissions`) → 3. `requirePolicy`

## Error Responses

```json
{ "erro": "Mensagem em português", "code": "FORBIDDEN" }
```

## Mappers

Snake_case DB → camelCase JSON in route-local `mapXxx()` functions.

## Config Endpoints

Lab config in `index.ts` at `/api/config/lab` — use `requirePolicy("config", "read"|"write")`.
