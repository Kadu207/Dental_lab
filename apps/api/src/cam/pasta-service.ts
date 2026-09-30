import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { LabDbClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { validateCamScanFile } from "./file-validate.js";
import { anexosDir, scansDir, sanitizeFilename } from "./storage-paths.js";

export type AnexoTipo = "scan" | "anexo" | "job_output";

export async function ensurePacientePasta(
  db: LabDbClient,
  clinicaId: number,
  pacienteId: string,
): Promise<{ id: string; pacienteId: string; createdAt?: string }> {
  const existing = await db.queryOne<{ id: string; created_at: string }>(
    "SELECT id, created_at FROM paciente_pastas WHERE clinica_id = ? AND paciente_id = ?",
    [clinicaId, pacienteId],
  );
  if (existing) {
    await fs.mkdir(scansDir(clinicaId, pacienteId), { recursive: true });
    await fs.mkdir(anexosDir(clinicaId, pacienteId), { recursive: true });
    return { id: existing.id, pacienteId, createdAt: existing.created_at };
  }

  const id = newId();
  await db.run(
    `INSERT INTO paciente_pastas (id, clinica_id, paciente_id) VALUES (?, ?, ?)`,
    [id, clinicaId, pacienteId],
  );
  await fs.mkdir(scansDir(clinicaId, pacienteId), { recursive: true });
  await fs.mkdir(anexosDir(clinicaId, pacienteId), { recursive: true });
  return { id, pacienteId };
}

export function mapAnexo(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    pastaId: row.pasta_id as string,
    pacienteId: row.paciente_id as string,
    tipo: row.tipo as string,
    nomeArquivo: row.nome_arquivo as string,
    mime: (row.mime as string) ?? null,
    checksumSha256: (row.checksum_sha256 as string) ?? null,
    storageKey: row.storage_key as string,
    tamanhoBytes: Number(row.tamanho_bytes ?? 0),
    proteseId: (row.protese_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listAnexos(db: LabDbClient, clinicaId: number, pacienteId: string) {
  const rows = await db.queryAll(
    `SELECT * FROM paciente_anexos WHERE clinica_id = ? AND paciente_id = ? ORDER BY created_at DESC`,
    [clinicaId, pacienteId],
  );
  return rows.map(mapAnexo);
}

export async function saveAnexoFromBuffer(
  db: LabDbClient,
  opts: {
    clinicaId: number;
    pacienteId: string;
    buffer: Buffer;
    filename: string;
    mime?: string | null;
    tipo?: AnexoTipo;
    proteseId?: string | null;
  },
) {
  const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [
    opts.clinicaId,
    opts.pacienteId,
  ]);
  if (!paciente) throw new Error("PACIENTE_NOT_FOUND");

  const pasta = await ensurePacientePasta(db, opts.clinicaId, opts.pacienteId);
  const tipo: AnexoTipo = opts.tipo ?? "scan";
  const validated = validateCamScanFile({
    filename: opts.filename,
    buffer: opts.buffer,
    declaredMime: opts.mime,
  });
  const safeName = sanitizeFilename(opts.filename);
  const dir = tipo === "scan" ? scansDir(opts.clinicaId, opts.pacienteId) : anexosDir(opts.clinicaId, opts.pacienteId);
  await fs.mkdir(dir, { recursive: true });

  const anexoId = newId();
  const storedName = `${anexoId}_${safeName}`;
  const absPath = path.join(dir, storedName);
  await fs.writeFile(absPath, opts.buffer);

  const checksum = createHash("sha256").update(opts.buffer).digest("hex");
  const storageKey = path.relative(
    path.join(process.cwd()),
    absPath,
  ).replace(/\\/g, "/");

  if (opts.proteseId) {
    const p = await db.queryOne(
      "SELECT id FROM proteses WHERE clinica_id = ? AND id = ? AND paciente_id = ?",
      [opts.clinicaId, opts.proteseId, opts.pacienteId],
    );
    if (!p) throw new Error("PROTESE_NOT_FOUND");
  }

  await db.run(
    `INSERT INTO paciente_anexos
     (id, clinica_id, pasta_id, paciente_id, tipo, nome_arquivo, mime, checksum_sha256, storage_key, tamanho_bytes, protese_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      anexoId,
      opts.clinicaId,
      pasta.id,
      opts.pacienteId,
      tipo,
      safeName,
      validated.mime,
      checksum,
      absPath,
      opts.buffer.length,
      opts.proteseId ?? null,
    ],
  );

  const row = await db.queryOne("SELECT * FROM paciente_anexos WHERE clinica_id = ? AND id = ?", [
    opts.clinicaId,
    anexoId,
  ]);
  return { anexo: mapAnexo(row!), storageKey, absPath };
}

export async function getAnexoRow(
  db: LabDbClient,
  clinicaId: number,
  pacienteId: string,
  anexoId: string,
) {
  return db.queryOne(
    `SELECT * FROM paciente_anexos WHERE clinica_id = ? AND paciente_id = ? AND id = ?`,
    [clinicaId, pacienteId, anexoId],
  );
}
