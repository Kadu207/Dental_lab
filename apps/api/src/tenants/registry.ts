import type { Pool } from "pg";
import { PLATFORM_SCHEMA, POSTGRES_SCHEMA } from "../config.js";
import { getPgPool } from "../db/pool.js";
import { provisionTenantSchema } from "./provision.js";

export type TenantStatus = "active" | "suspended" | "provisioning";

export interface TenantRecord {
  clinicaId: number;
  postgresSchema: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  clienteCodigo: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

const schemaCache = new Map<number, string>();

function q(schema: string, table: string) {
  return `${schema}.${table}`;
}

function mapRow(row: Record<string, unknown>): TenantRecord {
  return {
    clinicaId: Number(row.clinica_id),
    postgresSchema: String(row.postgres_schema),
    nomeFantasia: row.nome_fantasia != null ? String(row.nome_fantasia) : null,
    razaoSocial: row.razao_social != null ? String(row.razao_social) : null,
    cnpj: row.cnpj != null ? String(row.cnpj) : null,
    clienteCodigo: row.cliente_codigo != null ? String(row.cliente_codigo) : null,
    status: String(row.status) as TenantStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function requirePool(): Pool {
  const pool = getPgPool();
  if (!pool) throw new Error("Registry de tenants disponível apenas com Postgres");
  return pool;
}

export function invalidateTenantSchemaCache(clinicaId?: number) {
  if (clinicaId != null) schemaCache.delete(clinicaId);
  else schemaCache.clear();
}

/** Resolve schema Postgres do tenant Lab (fallback legado dental_lab). */
export async function resolveTenantSchema(clinicaId: number): Promise<string> {
  const cached = schemaCache.get(clinicaId);
  if (cached) return cached;

  const pool = getPgPool();
  if (!pool) return POSTGRES_SCHEMA;

  const row = await pool.query<{ postgres_schema: string; status: string }>(
    `SELECT postgres_schema, status FROM ${q(PLATFORM_SCHEMA, "tenants")} WHERE clinica_id = $1`,
    [clinicaId],
  );

  if (row.rowCount === 0) {
    if (clinicaId === 1) {
      schemaCache.set(1, POSTGRES_SCHEMA);
      return POSTGRES_SCHEMA;
    }
    throw new Error(`Tenant Lab ${clinicaId} não encontrado`);
  }

  if (row.rows[0].status === "suspended") {
    throw new Error(`Tenant Lab ${clinicaId} suspenso`);
  }

  const schema = row.rows[0].postgres_schema;
  schemaCache.set(clinicaId, schema);
  return schema;
}

export async function listTenants(): Promise<TenantRecord[]> {
  const pool = requirePool();
  const r = await pool.query(`SELECT * FROM ${q(PLATFORM_SCHEMA, "tenants")} ORDER BY clinica_id`);
  return r.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function getTenant(clinicaId: number): Promise<TenantRecord | null> {
  const pool = requirePool();
  const r = await pool.query(`SELECT * FROM ${q(PLATFORM_SCHEMA, "tenants")} WHERE clinica_id = $1`, [
    clinicaId,
  ]);
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as Record<string, unknown>);
}

export interface CreateTenantInput {
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  clienteCodigo?: string;
}

export async function createTenant(input: CreateTenantInput): Promise<TenantRecord> {
  const pool = requirePool();
  const next = await pool.query<{ next_id: number }>(
    `SELECT COALESCE(MAX(clinica_id), 0) + 1 AS next_id FROM ${q(PLATFORM_SCHEMA, "tenants")}`,
  );
  const clinicaId = Number(next.rows[0].next_id);
  const postgresSchema = `lab_t${clinicaId}`;

  await pool.query(
    `INSERT INTO ${q(PLATFORM_SCHEMA, "tenants")}
     (clinica_id, postgres_schema, nome_fantasia, razao_social, cnpj, cliente_codigo, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'provisioning')`,
    [
      clinicaId,
      postgresSchema,
      input.nomeFantasia ?? null,
      input.razaoSocial ?? null,
      input.cnpj ?? null,
      input.clienteCodigo ?? null,
    ],
  );

  try {
    await provisionTenantSchema(pool, postgresSchema);
    await pool.query(
      `UPDATE ${q(PLATFORM_SCHEMA, "tenants")} SET status = 'active', updated_at = NOW() WHERE clinica_id = $1`,
      [clinicaId],
    );
  } catch (e) {
    await pool.query(`DELETE FROM ${q(PLATFORM_SCHEMA, "tenants")} WHERE clinica_id = $1`, [clinicaId]);
    throw e;
  }

  schemaCache.set(clinicaId, postgresSchema);
  const created = await getTenant(clinicaId);
  return created!;
}

export interface UpdateTenantInput {
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  clienteCodigo?: string | null;
  status?: TenantStatus;
}

export async function updateTenant(clinicaId: number, input: UpdateTenantInput): Promise<TenantRecord | null> {
  const pool = requirePool();
  const current = await getTenant(clinicaId);
  if (!current) return null;

  await pool.query(
    `UPDATE ${q(PLATFORM_SCHEMA, "tenants")}
     SET nome_fantasia = COALESCE($2, nome_fantasia),
         razao_social = COALESCE($3, razao_social),
         cnpj = COALESCE($4, cnpj),
         cliente_codigo = COALESCE($5, cliente_codigo),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE clinica_id = $1`,
    [
      clinicaId,
      input.nomeFantasia ?? null,
      input.razaoSocial ?? null,
      input.cnpj ?? null,
      input.clienteCodigo ?? null,
      input.status ?? null,
    ],
  );

  if (input.status === "suspended") invalidateTenantSchemaCache(clinicaId);
  return getTenant(clinicaId);
}

/** Registra tenant legado (clinica_id=1 → dental_lab) após init Postgres. */
export async function ensureDefaultTenantRegistry(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO ${q(PLATFORM_SCHEMA, "tenants")}
     (clinica_id, postgres_schema, nome_fantasia, razao_social, status)
     VALUES (1, $1, 'Tenant Padrão', 'Laboratório Dental', 'active')
     ON CONFLICT (clinica_id) DO NOTHING`,
    [POSTGRES_SCHEMA],
  );
  schemaCache.set(1, POSTGRES_SCHEMA);
}
