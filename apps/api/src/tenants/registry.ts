import type { Pool } from "pg";
import { PLATFORM_SCHEMA, POSTGRES_SCHEMA } from "../config.js";
import { getPgPool } from "../db/pool.js";
import { provisionTenantSchema } from "./provision.js";
import { mapTenantRow, TENANT_SELECT_COLUMNS, type TenantPayload } from "./tenant-fields.js";

export type TenantStatus = "active" | "suspended" | "provisioning";

export interface TenantRecord {
  clinicaId: number;
  postgresSchema: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  cpf: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone1: string | null;
  telefone2: string | null;
  whatsapp: string | null;
  email1: string | null;
  email2: string | null;
  responsavelNome: string | null;
  responsavelContato: string | null;
  responsavelWhatsapp: string | null;
  responsavelEmail: string | null;
  instagram: string | null;
  facebook: string | null;
  excellenceClinicaId: number | null;
  clienteCodigo: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateTenantInput = Partial<
  Omit<TenantRecord, "clinicaId" | "postgresSchema" | "createdAt" | "updatedAt">
>;

export type UpdateTenantInput = CreateTenantInput;

const schemaCache = new Map<number, string>();

function q(table: string) {
  return `${PLATFORM_SCHEMA}.${table}`;
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
    `SELECT postgres_schema, status FROM ${q("tenants")} WHERE clinica_id = $1`,
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
  const r = await pool.query(`SELECT ${TENANT_SELECT_COLUMNS} FROM ${q("tenants")} ORDER BY clinica_id`);
  return r.rows.map((row) => mapTenantRow(row as Record<string, unknown>));
}

export async function getTenant(clinicaId: number): Promise<TenantRecord | null> {
  const pool = requirePool();
  const r = await pool.query(`SELECT ${TENANT_SELECT_COLUMNS} FROM ${q("tenants")} WHERE clinica_id = $1`, [
    clinicaId,
  ]);
  if (r.rowCount === 0) return null;
  return mapTenantRow(r.rows[0] as Record<string, unknown>);
}

function insertValues(input: TenantPayload) {
  return [
    input.nomeFantasia ?? null,
    input.razaoSocial ?? null,
    input.cnpj ?? null,
    input.cpf ?? null,
    input.inscricaoEstadual ?? null,
    input.inscricaoMunicipal ?? null,
    input.cep ?? null,
    input.endereco ?? null,
    input.numero ?? null,
    input.complemento ?? null,
    input.bairro ?? null,
    input.cidade ?? null,
    input.uf ?? null,
    input.telefone1 ?? null,
    input.telefone2 ?? null,
    input.whatsapp ?? null,
    input.email1 ?? null,
    input.email2 ?? null,
    input.responsavelNome ?? null,
    input.responsavelContato ?? null,
    input.responsavelWhatsapp ?? null,
    input.responsavelEmail ?? null,
    input.instagram ?? null,
    input.facebook ?? null,
    input.excellenceClinicaId ?? null,
    input.clienteCodigo ?? null,
  ];
}

export async function createTenant(input: TenantPayload): Promise<TenantRecord> {
  const pool = requirePool();
  const next = await pool.query<{ next_id: number }>(
    `SELECT COALESCE(MAX(clinica_id), 0) + 1 AS next_id FROM ${q("tenants")}`,
  );
  const clinicaId = Number(next.rows[0].next_id);
  const postgresSchema = `lab_t${clinicaId}`;
  const vals = insertValues(input);

  await pool.query(
    `INSERT INTO ${q("tenants")}
     (clinica_id, postgres_schema, nome_fantasia, razao_social, cnpj, cpf,
      inscricao_estadual, inscricao_municipal, cep, endereco, numero, complemento,
      bairro, cidade, uf, telefone1, telefone2, whatsapp, email1, email2,
      responsavel_nome, responsavel_contato, responsavel_whatsapp, responsavel_email,
      instagram, facebook, excellence_clinica_id, cliente_codigo, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
             $21, $22, $23, $24, $25, $26, $27, $28, 'provisioning')`,
    [clinicaId, postgresSchema, ...vals],
  );

  try {
    await provisionTenantSchema(pool, postgresSchema);
    await pool.query(
      `UPDATE ${q("tenants")} SET status = 'active', updated_at = NOW() WHERE clinica_id = $1`,
      [clinicaId],
    );
  } catch (e) {
    await pool.query(`DELETE FROM ${q("tenants")} WHERE clinica_id = $1`, [clinicaId]);
    throw e;
  }

  schemaCache.set(clinicaId, postgresSchema);
  const created = await getTenant(clinicaId);
  return created!;
}

export async function updateTenant(clinicaId: number, input: TenantPayload): Promise<TenantRecord | null> {
  const pool = requirePool();
  const current = await getTenant(clinicaId);
  if (!current) return null;

  const vals = insertValues(input);
  const status = input.status ?? current.status;

  await pool.query(
    `UPDATE ${q("tenants")}
     SET nome_fantasia = $2, razao_social = $3, cnpj = $4, cpf = $5,
         inscricao_estadual = $6, inscricao_municipal = $7, cep = $8, endereco = $9,
         numero = $10, complemento = $11, bairro = $12, cidade = $13, uf = $14,
         telefone1 = $15, telefone2 = $16, whatsapp = $17, email1 = $18, email2 = $19,
         responsavel_nome = $20, responsavel_contato = $21, responsavel_whatsapp = $22,
         responsavel_email = $23, instagram = $24, facebook = $25, excellence_clinica_id = $26,
         cliente_codigo = $27, status = $28, updated_at = NOW()
     WHERE clinica_id = $1`,
    [clinicaId, ...vals, status],
  );

  if (status === "suspended") invalidateTenantSchemaCache(clinicaId);
  else if (status === "active") schemaCache.set(clinicaId, current.postgresSchema);

  return getTenant(clinicaId);
}

export async function setTenantsStatus(clinicaIds: number[], status: TenantStatus): Promise<number> {
  const pool = requirePool();
  const ids = clinicaIds.filter((id) => id > 1);
  if (ids.length === 0) return 0;

  const r = await pool.query(
    `UPDATE ${q("tenants")} SET status = $1, updated_at = NOW()
     WHERE clinica_id = ANY($2::int[])`,
    [status, ids],
  );

  for (const id of ids) {
    if (status === "suspended") invalidateTenantSchemaCache(id);
  }
  return r.rowCount ?? 0;
}

export async function deleteTenant(clinicaId: number): Promise<boolean> {
  if (clinicaId <= 1) throw new Error("Não é permitido remover o tenant padrão (#1)");
  const pool = requirePool();
  const r = await pool.query(`DELETE FROM ${q("tenants")} WHERE clinica_id = $1`, [clinicaId]);
  invalidateTenantSchemaCache(clinicaId);
  return (r.rowCount ?? 0) > 0;
}

/** Registra tenant legado (clinica_id=1 → dental_lab) após init Postgres. */
export async function ensureDefaultTenantRegistry(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO ${q("tenants")}
     (clinica_id, postgres_schema, nome_fantasia, razao_social, status)
     VALUES (1, $1, 'Tenant Padrão', 'Laboratório Dental', 'active')
     ON CONFLICT (clinica_id) DO NOTHING`,
    [POSTGRES_SCHEMA],
  );
  schemaCache.set(1, POSTGRES_SCHEMA);
}
