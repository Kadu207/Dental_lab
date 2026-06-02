import type { LabDbClient } from "../db/client.js";
import {
  generateLabSecret,
  generateLicenseKey,
  nowTs,
  PERIOD_LABELS,
  PRODUCT_LABELS,
  refreshLicenseStatus,
  type LicenseRow,
} from "./core.js";

function mapRow(raw: Record<string, unknown>): LicenseRow {
  return {
    id: Number(raw.id),
    license_key: String(raw.license_key ?? ""),
    clinica_id: raw.clinica_id == null ? null : Number(raw.clinica_id),
    unidade_id: raw.unidade_id == null || raw.unidade_id === "" ? null : String(raw.unidade_id),
    produto: String(raw.produto ?? "lab"),
    periodo: String(raw.periodo ?? "trial"),
    cliente_nome: String(raw.cliente_nome ?? ""),
    starts_at: String(raw.starts_at ?? ""),
    ends_at: String(raw.ends_at ?? ""),
    status: String(raw.status ?? "pending"),
    activated_at: raw.activated_at ? String(raw.activated_at) : null,
    lab_secret: raw.lab_secret ? String(raw.lab_secret) : null,
    created_at: String(raw.created_at ?? ""),
    created_by: String(raw.created_by ?? ""),
    notes: String(raw.notes ?? ""),
  };
}

async function findLicenseByKey(db: LabDbClient, key: string): Promise<LicenseRow | null> {
  const row = await db.queryOne<Record<string, unknown>>(
    "SELECT * FROM product_licenses WHERE license_key = ? LIMIT 1",
    [key],
  );
  return row ? mapRow(row) : null;
}

export async function listLicensesForTenant(db: LabDbClient, clinicaId: number): Promise<LicenseRow[]> {
  const rows = await db.queryAll<Record<string, unknown>>(
    "SELECT * FROM product_licenses WHERE clinica_id = ? ORDER BY id DESC",
    [clinicaId],
  );
  return rows.map(mapRow);
}

export async function generateLicenseForTenant(
  db: LabDbClient,
  clinicaId: number,
  input: {
    produto: string;
    periodo: string;
    clienteNome?: string;
    unidadeId?: string | null;
    createdBy?: string;
    notes?: string;
  },
): Promise<LicenseRow> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const key = generateLicenseKey();
    const existing = await findLicenseByKey(db, key);
    if (existing) continue;
    const starts = nowTs();
    await db.run(
      `INSERT INTO product_licenses (license_key, clinica_id, unidade_id, produto, periodo, cliente_nome, starts_at, ends_at, status, activated_at, lab_secret, created_at, created_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?)`,
      [
        key,
        clinicaId,
        input.unidadeId ?? null,
        input.produto,
        input.periodo,
        input.clienteNome ?? "",
        "",
        "",
        generateLabSecret(),
        starts,
        input.createdBy ?? "supervisor",
        input.notes ?? "",
      ],
    );
    const row = await findLicenseByKey(db, key);
    if (row) return row;
  }
  throw new Error("LICENSE_GENERATION_FAILED");
}

export function serializeLicenseRow(row: LicenseRow) {
  return {
    id: row.id,
    licenseKey: row.license_key,
    clinicaId: row.clinica_id,
    unidadeId: row.unidade_id,
    produto: row.produto,
    produtoLabel: PRODUCT_LABELS[row.produto] ?? row.produto,
    periodo: row.periodo,
    periodoLabel: PERIOD_LABELS[row.periodo] ?? row.periodo,
    clienteNome: row.cliente_nome,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: refreshLicenseStatus(row),
    createdAt: row.created_at,
    createdBy: row.created_by,
    notes: row.notes,
  };
}
