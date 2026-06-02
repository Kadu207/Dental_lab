import { PLATFORM_SCHEMA } from "../config.js";
import { getPgPool } from "../db/pool.js";
import type { TenantBackupBundle } from "./backup.js";

export interface TenantBackupLogRecord {
  id: number;
  clinicaId: number;
  postgresSchema: string;
  filename: string;
  rowCount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  clienteCodigo?: string | null;
}

function q(table: string) {
  return `${PLATFORM_SCHEMA}.${table}`;
}

export function countBundleRows(bundle: TenantBackupBundle): number {
  let total = 0;
  for (const rows of Object.values(bundle.tables)) {
    total += rows.length;
  }
  return total;
}

export async function logBackupExport(input: {
  clinicaId: number;
  postgresSchema: string;
  filename: string;
  rowCount: number;
  notes?: string;
  createdBy?: string;
}): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(
    `INSERT INTO ${q("tenant_backup_log")} (clinica_id, postgres_schema, filename, row_count, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.clinicaId,
      input.postgresSchema,
      input.filename,
      input.rowCount,
      input.notes?.trim() || null,
      input.createdBy?.trim() || null,
    ],
  );
}

export async function listBackupLogs(limit = 100): Promise<TenantBackupLogRecord[]> {
  const pool = getPgPool();
  if (!pool) return [];

  const r = await pool.query(
    `SELECT l.id, l.clinica_id, l.postgres_schema, l.filename, l.row_count, l.notes, l.created_by, l.created_at,
            t.nome_fantasia, t.razao_social, t.cliente_codigo
     FROM ${q("tenant_backup_log")} l
     LEFT JOIN ${q("tenants")} t ON t.clinica_id = l.clinica_id
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return r.rows.map((row) => ({
    id: Number(row.id),
    clinicaId: Number(row.clinica_id),
    postgresSchema: String(row.postgres_schema),
    filename: String(row.filename),
    rowCount: Number(row.row_count),
    notes: row.notes != null ? String(row.notes) : null,
    createdBy: row.created_by != null ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    nomeFantasia: row.nome_fantasia != null ? String(row.nome_fantasia) : null,
    razaoSocial: row.razao_social != null ? String(row.razao_social) : null,
    clienteCodigo: row.cliente_codigo != null ? String(row.cliente_codigo) : null,
  }));
}
