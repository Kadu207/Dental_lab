import type { LabDbClient } from "../db/client.js";
import { DB_DRIVER, POSTGRES_SCHEMA } from "../config.js";
import { getPgPool, getSqliteDb } from "../db/client.js";
import {
  computeEndsAt,
  generateLabSecret,
  generateLicenseKey,
  isValidLicenseKeyFormat,
  licenseStatusPayload,
  normalizeLicenseKey,
  nowTs,
  type LicenseRow,
  refreshLicenseStatus,
} from "./core.js";
import {
  isRemoteLicenseEnabled,
  LicenseServerError,
  remoteActivateLicense,
  remoteLicenseStatus,
  type RemoteLicensePayload,
} from "./remote-client.js";
import { ensureMatrizTrial, ensureUnidadeTrial, getTrialRow, trialStatusPayload } from "./trial.js";

export { ensureMatrizTrial, ensureUnidadeTrial };

const TABLE = "product_licenses";

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

function qualified(table: string): string {
  return DB_DRIVER === "postgres" ? `${POSTGRES_SCHEMA}.${table}` : table;
}

async function queryAll(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (DB_DRIVER === "postgres") {
    const pool = getPgPool();
    if (!pool) return [];
    let text = sql;
    let i = 0;
    text = text.replace(/\?/g, () => `$${++i}`);
    const r = await pool.query(text, params);
    return r.rows as Record<string, unknown>[];
  }
  const db = getSqliteDb();
  if (!db) return [];
  return db.prepare(sql).all(...params) as Record<string, unknown>[];
}

async function run(sql: string, params: unknown[] = []): Promise<void> {
  if (DB_DRIVER === "postgres") {
    const pool = getPgPool();
    if (!pool) return;
    let text = sql;
    let i = 0;
    text = text.replace(/\?/g, () => `$${++i}`);
    await pool.query(text, params);
    return;
  }
  const db = getSqliteDb();
  if (!db) return;
  db.prepare(sql).run(...params);
}

function scopeSql(unidadeId?: string | null): { clause: string; params: unknown[] } {
  if (unidadeId) {
    return { clause: "unidade_id = ?", params: [unidadeId] };
  }
  return { clause: "(unidade_id IS NULL OR unidade_id = '')", params: [] };
}

export async function getActiveLicense(
  clinicaId: number,
  unidadeId?: string | null,
): Promise<LicenseRow | null> {
  const scope = scopeSql(unidadeId);
  const rows = await queryAll(
    `SELECT * FROM ${qualified(TABLE)} WHERE clinica_id = ? AND ${scope.clause} ORDER BY id DESC`,
    [clinicaId, ...scope.params],
  );
  for (const raw of rows) {
    const row = mapRow(raw);
    const status = refreshLicenseStatus(row);
    if (status !== row.status) {
      await run(`UPDATE ${qualified(TABLE)} SET status = ? WHERE id = ?`, [status, row.id]);
      row.status = status;
    }
    if (status === "active") return row;
  }
  return null;
}

async function cacheRemoteActivation(
  clinicaId: number,
  unidadeId: string | null,
  remote: RemoteLicensePayload,
  licenseKey: string,
): Promise<LicenseRow> {
  const key = normalizeLicenseKey(licenseKey);
  const existing = await findLicenseByKey(key);
  const labSecret = existing?.lab_secret ?? generateLabSecret();
  if (existing) {
    await run(
      `UPDATE ${qualified(TABLE)} SET clinica_id = ?, unidade_id = ?, produto = ?, periodo = ?, starts_at = ?, ends_at = ?, status = 'active', activated_at = ?, lab_secret = ? WHERE id = ?`,
      [
        clinicaId,
        unidadeId,
        remote.produto ?? "lab",
        remote.periodo ?? "1y",
        remote.startsAt ?? nowTs(),
        remote.endsAt ?? "",
        nowTs(),
        labSecret,
        existing.id,
      ],
    );
  } else {
    await run(
      `INSERT INTO ${qualified(TABLE)} (license_key, clinica_id, unidade_id, produto, periodo, cliente_nome, starts_at, ends_at, status, activated_at, lab_secret, created_at, created_by, notes)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, 'active', ?, ?, ?, 'remote', '')`,
      [
        key,
        clinicaId,
        unidadeId,
        remote.produto ?? "lab",
        remote.periodo ?? "1y",
        remote.startsAt ?? nowTs(),
        remote.endsAt ?? "",
        nowTs(),
        labSecret,
        nowTs(),
      ],
    );
  }
  const scope = scopeSql(unidadeId);
  await run(
    `UPDATE ${qualified(TABLE)} SET status = 'revoked' WHERE clinica_id = ? AND ${scope.clause} AND license_key <> ? AND status = 'active'`,
    [clinicaId, ...scope.params, key],
  );
  const updated = await findLicenseByKey(key);
  if (!updated) throw new Error("LICENSE_ACTIVATION_FAILED");
  return updated;
}

export async function findLicenseByKey(key: string): Promise<LicenseRow | null> {
  const rows = await queryAll(`SELECT * FROM ${qualified(TABLE)} WHERE license_key = ? LIMIT 1`, [key]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function verifyLicenseHeader(header: string, clinicaId: number, envKey: string): Promise<boolean> {
  const trimmed = header.trim();
  if (!trimmed) return false;
  if (envKey && trimmed === envKey) return true;

  const byKey = await findLicenseByKey(normalizeLicenseKey(trimmed));
  if (byKey) {
    const status = refreshLicenseStatus(byKey);
    if (status !== "active") return false;
    if (byKey.clinica_id != null && byKey.clinica_id !== clinicaId) return false;
    return true;
  }

  const active = await getActiveLicense(clinicaId, null);
  if (!active) return false;
  if (active.lab_secret && trimmed === active.lab_secret) return true;
  if (active.license_key && trimmed === active.license_key) return true;
  return false;
}

export async function activateLicense(
  clinicaId: number,
  licenseKey: string,
  unidadeId?: string | null,
): Promise<LicenseRow> {
  const key = normalizeLicenseKey(licenseKey);
  if (!isValidLicenseKeyFormat(key)) throw new Error("INVALID_LICENSE_KEY");

  const scopeUid = unidadeId?.trim() || null;

  if (isRemoteLicenseEnabled()) {
    try {
      const remote = await remoteActivateLicense({
        licenseKey: key,
        clinicaId,
        unidadeId: scopeUid,
      });
      const row = await cacheRemoteActivation(clinicaId, scopeUid, remote, key);
      setCachedRemoteStatus(clinicaId, scopeUid, remoteToPayload(remote));
      return row;
    } catch (e) {
      if (e instanceof LicenseServerError) throw new Error(e.code);
      throw e;
    }
  }

  const row = await findLicenseByKey(key);
  if (!row) throw new Error("LICENSE_NOT_FOUND");
  if (row.status === "revoked") throw new Error("LICENSE_REVOKED");
  if (row.clinica_id != null && row.clinica_id !== clinicaId) throw new Error("LICENSE_ALREADY_USED");
  if (row.unidade_id && scopeUid && row.unidade_id !== scopeUid) throw new Error("LICENSE_ALREADY_USED");

  const starts = nowTs();
  const ends = computeEndsAt(starts, row.periodo);
  const labSecret = row.lab_secret ?? generateLabSecret();
  await run(
    `UPDATE ${qualified(TABLE)} SET clinica_id = ?, unidade_id = ?, starts_at = ?, ends_at = ?, status = 'active', activated_at = ?, lab_secret = ? WHERE id = ?`,
    [clinicaId, scopeUid, starts, ends, starts, labSecret, row.id],
  );
  const scope = scopeSql(scopeUid);
  await run(
    `UPDATE ${qualified(TABLE)} SET status = 'revoked' WHERE clinica_id = ? AND ${scope.clause} AND id <> ? AND status = 'active'`,
    [clinicaId, ...scope.params, row.id],
  );
  const updated = await findLicenseByKey(key);
  if (!updated) throw new Error("LICENSE_ACTIVATION_FAILED");
  return updated;
}

export async function generateLicense(input: {
  produto: string;
  periodo: string;
  clienteNome?: string;
  clinicaId?: number | null;
  unidadeId?: string | null;
  createdBy?: string;
  notes?: string;
}): Promise<LicenseRow> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const key = generateLicenseKey();
    const existing = await findLicenseByKey(key);
    if (existing) continue;
    const pre = input.clinicaId != null;
    const starts = nowTs();
    await run(
      `INSERT INTO ${qualified(TABLE)} (license_key, clinica_id, unidade_id, produto, periodo, cliente_nome, starts_at, ends_at, status, activated_at, lab_secret, created_at, created_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        key,
        input.clinicaId ?? null,
        input.unidadeId ?? null,
        input.produto,
        input.periodo,
        input.clienteNome ?? "",
        pre ? starts : "",
        pre ? computeEndsAt(starts, input.periodo) : "",
        pre ? "active" : "pending",
        pre ? starts : null,
        generateLabSecret(),
        starts,
        input.createdBy ?? "api",
        input.notes ?? "",
      ],
    );
    const row = await findLicenseByKey(key);
    if (row) return row;
  }
  throw new Error("LICENSE_GENERATION_FAILED");
}

export async function listLicenses(limit = 200): Promise<LicenseRow[]> {
  const rows = await queryAll(`SELECT * FROM ${qualified(TABLE)} ORDER BY id DESC LIMIT ?`, [limit]);
  return rows.map(mapRow);
}

function remoteToPayload(remote: RemoteLicensePayload): Record<string, unknown> {
  const daysLeft = remote.daysLeft ?? remote.daysRemaining ?? 0;
  const valid = remote.valid ?? remote.hasLicense ?? false;
  return {
    hasLicense: valid,
    valid,
    status: remote.status ?? (valid ? "active" : "none"),
    phase: remote.phase ?? remote.paymentPhase,
    produto: remote.produto ?? "lab",
    produtoLabel: remote.produtoLabel ?? "",
    periodo: remote.periodo ?? "",
    periodoLabel: remote.periodoLabel ?? "",
    startsAt: remote.startsAt ?? "",
    endsAt: remote.endsAt ?? "",
    daysLeft,
    daysRemaining: daysLeft,
    licenseExpired: remote.licenseExpired ?? false,
    paymentPhase: remote.paymentPhase,
    licenseKeyMasked: remote.licenseKeyMasked ?? "",
    unidadeId: remote.unidadeId ?? null,
    alertLevel: remote.alertLevel ?? "none",
    alertMessage: remote.message ?? "",
    isTrial: false,
    source: remote.source ?? "license-server",
    remoteEnabled: true,
  };
}

const statusCache = new Map<string, { at: number; payload: Record<string, unknown> }>();
const STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(clinicaId: number, unidadeId: string | null): string {
  return `${clinicaId}:${unidadeId ?? ""}`;
}

export function getCachedRemoteStatus(clinicaId: number, unidadeId: string | null): Record<string, unknown> | null {
  const hit = statusCache.get(cacheKey(clinicaId, unidadeId));
  if (!hit) return null;
  if (Date.now() - hit.at > STATUS_CACHE_TTL_MS) {
    statusCache.delete(cacheKey(clinicaId, unidadeId));
    return null;
  }
  return hit.payload;
}

export function setCachedRemoteStatus(
  clinicaId: number,
  unidadeId: string | null,
  payload: Record<string, unknown>,
): void {
  statusCache.set(cacheKey(clinicaId, unidadeId), { at: Date.now(), payload });
}

export async function buildStatusWithTrial(
  db: LabDbClient,
  clinicaId: number,
  unidadeId?: string | null,
): Promise<Record<string, unknown>> {
  const scopeUid = unidadeId?.trim() || null;

  if (isRemoteLicenseEnabled()) {
    const cached = getCachedRemoteStatus(clinicaId, scopeUid);
    if (cached) {
      return { ...cached, clinicaId };
    }
    try {
      const remote = await remoteLicenseStatus({ clinicaId, unidadeId: scopeUid });
      if (remote.hasLicense || remote.valid) {
        const payload = { ...remoteToPayload(remote), clinicaId };
        setCachedRemoteStatus(clinicaId, scopeUid, payload);
        return payload;
      }
    } catch {
      /* fallback local */
    }
  }

  const lic = await getActiveLicense(clinicaId, scopeUid);
  if (lic) {
    return {
      ...licenseStatusPayload(lic),
      unidadeId: scopeUid,
      isTrial: false,
      remoteEnabled: isRemoteLicenseEnabled(),
    };
  }

  const trial = await getTrialRow(db, clinicaId, scopeUid);
  if (trial?.trial_started_at) {
    let unidadeNome: string | undefined;
    if (scopeUid) {
      const u = await db.queryOne<{ nome: string }>(
        "SELECT nome FROM empresa_unidades WHERE clinica_id = ? AND id = ?",
        [clinicaId, scopeUid],
      );
      unidadeNome = u?.nome;
    }
    return {
      ...trialStatusPayload(trial, scopeUid, unidadeNome),
      remoteEnabled: isRemoteLicenseEnabled(),
    };
  }

  return {
    ...licenseStatusPayload(null),
    unidadeId: scopeUid,
    remoteEnabled: isRemoteLicenseEnabled(),
    alertMessage: scopeUid
      ? "Filial sem licença. O teste de 30 dias inicia ao cadastrar a unidade, ou insira a chave comercial."
      : "Cadastre e salve a empresa para iniciar o teste de 30 dias, ou insira a licença comercial.",
  };
}
