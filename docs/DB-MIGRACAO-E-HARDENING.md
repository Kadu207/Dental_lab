# DB Migracao e Hardening (Dental Lab)

Este projeto inicializa e evolui schema via `apps/api/src/db/init.ts` e arquivos SQL base:

- `apps/api/src/db/schema-postgres.sql`
- `apps/api/src/db/schema-platform.sql`

## Fluxo seguro de migracao (standalone)

1. Subir stack:
   - `docker compose -f docker-compose.standalone.yml up -d --build`
2. Gerar backup antes da mudanca:
   - `pwsh ./infra/ops/backup-standalone.ps1`
3. Aplicar alteracoes de schema no codigo (`init.ts` + SQL base).
4. Rebuild/restart da API para aplicar migracoes idempotentes:
   - `docker compose -f docker-compose.standalone.yml up -d --build lab-api`
5. Validar saude:
   - `pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180`

## Smoke de isolamento de tenant (clinica_id)

Para validar CRUD com dois tenants distintos no banco standalone:

- `pwsh ./scripts/tenant_clinica_smoke.ps1`

Esse smoke executa `scripts/tenant_clinica_smoke.sql` e valida:

- create/read/update/delete para `clinica_id = 101`
- create/read/update/delete para `clinica_id = 202`
- ausencia de residuos apos limpeza

## Busca de pacientes, idempotencia e retry

A listagem de pacientes nao usa `LIKE '%termo%'`. O texto digitado nunca entra no SQL: so parametros. `%` e `_` sao literais, nao curingas.

O termo passa por normalizacao (NFKC, sem controles, no maximo 80 caracteres) e por dobradura de acentos do pt-BR.

| Driver | Indice | Consulta |
|--------|--------|----------|
| Postgres | colunas geradas `busca_texto` e `search_vector` (`tsvector`, `simple`) + GIN `idx_lab_clientes_search` | `search_vector @@ to_tsquery('simple', token:*)` ou `strpos(busca_texto, texto dobrado)` |
| SQLite | FTS5 `clientes_fts` (`unicode61 remove_diacritics 2`) + `busca_texto` | `MATCH` com prefixo ou `instr` no texto dobrado |

Prefixo encontra o inicio do nome (`maria` encontra Maria). O `strpos`/`instr` cobre o miolo (`aria` em Maria) e a frase inteira. Varios tokens usam E no full-text (`maria` e `silva` encontram Maria da Silva). CPF e telefone entram crus e so com digitos.

Na subida, a API cria estes objetos se ainda nao existirem (`init.ts`):

- Postgres: `busca_texto`, `search_vector` e o indice GIN em `clientes`; tabela `integration_events` no schema padrao
- SQLite: `busca_texto`, a tabela FTS5 `clientes_fts` e `integration_events`

Tenant novo no Postgres recebe as mesmas colunas em `provisionTenantSchema`. Backup de tenant nao exporta nem reinsere `busca_texto` e `search_vector` (colunas geradas).

`integration_events` fica no schema padrao (`dental_lab`), fora do RLS e fora do clone por tenant.

### Idempotencia

Webhooks de entrada (`POST /api/webhooks/n8n` e `/api/webhooks/chatwoot`) gravam a chave em `integration_events`, unica em `(direction, channel, idempotency_key)`.

Ordem da chave:

1. header `Idempotency-Key`
2. `id` ou `event_id` do corpo, se casar `^[A-Za-z0-9._:-]{8,200}$`
3. `sha256:` do JSON do corpo

Repeticao responde `{ ok: true, deduplicated: true }`. Sem banco: `503` e `WEBHOOK_STORE_UNAVAILABLE`.

Saida N8N/Chatwoot manda `id` estavel no payload e o mesmo valor no header `Idempotency-Key`.

Sync de paciente do ERP continua idempotente pelo id `erp-{clinica}-{erpId}` e pelo indice unico `(clinica_id, erp_paciente_id)`.

### Retry

Ate 3 tentativas em erro de rede, HTTP 408, 429 e 5xx. Espera exponencial com jitter (0,5–1,0), teto de 5 s. O corpo nao muda entre tentativas. 4xx nao repete. Timeout padrao de 10 s.

O cliente de licenca usa a mesma regra de status e de erro de rede. E-mail de redefinicao de senha nao repete, para nao enviar a mensagem duas vezes.

## Observacoes de seguranca

- Em producao, use secrets fortes para `LAB_POSTGRES_PASSWORD` e `DENTAL_LAB_JWT_SECRET`.
- Evite manter credenciais default (`admin/admin123`) apos bootstrap inicial.
- Use backups recorrentes (`infra/ops/backup-postgres-vps.sh`) e rotina de restore testado.
