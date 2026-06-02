import type { Pool, PoolClient } from "pg";
import { getPgPool } from "../db/pool.js";
import { createTenant, getTenant, resolveTenantSchema, type TenantRecord } from "./registry.js";
import { invalidateTenantSchemaCache } from "./registry.js";

export const BACKUP_FORMAT_VERSION = 1;

/** Ordem de import respeitando FKs entre tabelas do tenant. */
const TABLE_ORDER = [
  "fornecedores",
  "clientes",
  "estoque",
  "proteses",
  "status_historico",
  "config",
  "empresa",
  "empresa_unidades",
  "financeiro",
  "procedimentos",
  "grupos_permissoes",
  "product_licenses",
  "lab_usuarios",
] as const;

export type TenantTableName = (typeof TABLE_ORDER)[number];

export interface TenantBackupBundle {
  formatVersion: number;
  exportedAt: string;
  sourceClinicaId: number;
  sourcePostgresSchema: string;
  tables: Record<TenantTableName, Record<string, unknown>[]>;
}

function requirePool(): Pool {
  const pool = getPgPool();
  if (!pool) throw new Error("Backup de tenant disponível apenas com Postgres");
  return pool;
}

function qualify(schema: string, table: string) {
  return `${schema}.${table}`;
}

export async function exportTenantBackup(clinicaId: number): Promise<TenantBackupBundle> {
  const tenant = await getTenant(clinicaId);
  if (!tenant) throw new Error(`Tenant Lab ${clinicaId} não encontrado`);

  const schema = await resolveTenantSchema(clinicaId);
  const pool = requirePool();
  const tables = {} as TenantBackupBundle["tables"];

  for (const table of TABLE_ORDER) {
    const hasClinica = table !== "empresa";
    const sql = hasClinica
      ? `SELECT * FROM ${qualify(schema, table)} WHERE clinica_id = $1`
      : `SELECT * FROM ${qualify(schema, table)} WHERE clinica_id = $1`;
    const r = await pool.query(sql, [clinicaId]);
    tables[table] = r.rows as Record<string, unknown>[];
  }

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceClinicaId: clinicaId,
    sourcePostgresSchema: schema,
    tables,
  };
}

async function deleteTenantData(client: PoolClient, schema: string, clinicaId: number) {
  const reverse = [...TABLE_ORDER].reverse();
  for (const table of reverse) {
    if (table === "empresa") {
      await client.query(`DELETE FROM ${qualify(schema, table)} WHERE clinica_id = $1`, [clinicaId]);
    } else {
      await client.query(`DELETE FROM ${qualify(schema, table)} WHERE clinica_id = $1`, [clinicaId]);
    }
  }
}

function rowColumns(row: Record<string, unknown>): string[] {
  return Object.keys(row);
}

async function insertRow(
  client: PoolClient,
  schema: string,
  table: TenantTableName,
  row: Record<string, unknown>,
  targetClinicaId: number,
) {
  const data: Record<string, unknown> = { ...row, clinica_id: targetClinicaId };
  const cols = rowColumns(data);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const values = cols.map((c) => data[c]);

  if (table === "product_licenses") {
    await client.query(
      `INSERT INTO ${qualify(schema, table)} (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (license_key) DO NOTHING`,
      values,
    );
    return;
  }

  if (table === "config") {
    await client.query(
      `INSERT INTO ${qualify(schema, table)} (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (clinica_id, chave) DO UPDATE SET valor = EXCLUDED.valor`,
      values,
    );
    return;
  }

  if (table === "empresa") {
    await client.query(
      `INSERT INTO ${qualify(schema, table)} (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (clinica_id) DO UPDATE SET
         razao_social = EXCLUDED.razao_social,
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         updated_at = EXCLUDED.updated_at`,
      values,
    );
    return;
  }

  if (table === "lab_usuarios") {
    await client.query(
      `INSERT INTO ${qualify(schema, table)} (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (clinica_id, nome) DO NOTHING`,
      values,
    );
    return;
  }

  await client.query(
    `INSERT INTO ${qualify(schema, table)} (${cols.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (id) DO NOTHING`,
    values,
  );
}

export async function importTenantBackup(
  targetClinicaId: number,
  bundle: TenantBackupBundle,
  options: { replace?: boolean } = {},
): Promise<{ clinicaId: number; postgresSchema: string; importedRows: number }> {
  if (bundle.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error("Versão de backup não suportada");
  }

  const tenant = await getTenant(targetClinicaId);
  if (!tenant) throw new Error(`Tenant Lab ${targetClinicaId} não encontrado`);

  const schema = await resolveTenantSchema(targetClinicaId);
  const pool = requirePool();
  const client = await pool.connect();

  let importedRows = 0;

  try {
    await client.query("BEGIN");

    if (options.replace) {
      await deleteTenantData(client, schema, targetClinicaId);
    }

    for (const table of TABLE_ORDER) {
      const rows = bundle.tables[table] ?? [];
      for (const row of rows) {
        await insertRow(client, schema, table, row, targetClinicaId);
        importedRows++;
      }
    }

    await client.query("COMMIT");
    invalidateTenantSchemaCache(targetClinicaId);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return { clinicaId: targetClinicaId, postgresSchema: schema, importedRows };
}

export async function importBackupToNewTenant(
  bundle: TenantBackupBundle,
  meta: { nomeFantasia?: string; razaoSocial?: string; cnpj?: string; clienteCodigo?: string },
): Promise<{ tenant: TenantRecord; importedRows: number }> {
  const created = await createTenant({
    nomeFantasia: meta.nomeFantasia ?? `Importado ${bundle.sourceClinicaId}`,
    razaoSocial: meta.razaoSocial ?? `Tenant importado de ${bundle.sourceClinicaId}`,
    cnpj: meta.cnpj,
    clienteCodigo: meta.clienteCodigo,
  });

  const result = await importTenantBackup(created.clinicaId, bundle, { replace: true });
  return { tenant: created, importedRows: result.importedRows };
}
