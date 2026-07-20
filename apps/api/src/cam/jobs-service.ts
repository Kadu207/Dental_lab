import fs from "fs/promises";
import type { LabDbClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { getCamAdapter } from "./registry.js";
import type { CamCapability, CamJobStatus } from "./types.js";
import { mapAnexo } from "./pasta-service.js";

export function mapCamJob(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    pacienteId: row.paciente_id as string,
    anexoId: (row.anexo_id as string) ?? null,
    proteseId: (row.protese_id as string) ?? null,
    adapterId: row.adapter_id as string,
    capability: row.capability as string,
    status: row.status as string,
    perfil: (row.perfil as string) ?? null,
    mensagem: (row.mensagem as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createAndSendCamJob(
  db: LabDbClient,
  opts: {
    clinicaId: number;
    pacienteId: string;
    anexoId: string;
    adapterId: string;
    capability: CamCapability;
    perfil?: string | null;
    proteseId?: string | null;
  },
) {
  const adapter = getCamAdapter(opts.adapterId);
  if (!adapter) throw new Error("ADAPTER_NOT_FOUND");
  if (!adapter.capabilities.includes(opts.capability)) {
    throw new Error("ADAPTER_CAPABILITY_MISMATCH");
  }

  const anexoRow = await db.queryOne(
    `SELECT * FROM paciente_anexos WHERE clinica_id = ? AND paciente_id = ? AND id = ?`,
    [opts.clinicaId, opts.pacienteId, opts.anexoId],
  );
  if (!anexoRow) throw new Error("ANEXO_NOT_FOUND");
  const anexo = mapAnexo(anexoRow);

  try {
    await fs.access(anexo.storageKey);
  } catch {
    throw new Error("ANEXO_FILE_MISSING");
  }

  if (opts.proteseId) {
    const p = await db.queryOne(
      "SELECT id FROM proteses WHERE clinica_id = ? AND id = ? AND paciente_id = ?",
      [opts.clinicaId, opts.proteseId, opts.pacienteId],
    );
    if (!p) throw new Error("PROTESE_NOT_FOUND");
  }

  const jobId = newId();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO cam_jobs
     (id, clinica_id, paciente_id, anexo_id, protese_id, adapter_id, capability, status, perfil, mensagem, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`,
    [
      jobId,
      opts.clinicaId,
      opts.pacienteId,
      opts.anexoId,
      opts.proteseId ?? null,
      opts.adapterId,
      opts.capability,
      opts.perfil ?? null,
      null,
      now,
      now,
    ],
  );

  let status: CamJobStatus = "queued";
  let mensagem: string | undefined;

  if (!adapter.available && opts.adapterId !== "filesystem") {
    // stubs: ainda executa sendJob que retorna stub
  }

  try {
    const result = await adapter.sendJob({
      clinicaId: opts.clinicaId,
      jobId,
      pacienteId: opts.pacienteId,
      capability: opts.capability,
      perfil: opts.perfil ?? undefined,
      sourceFilePath: anexo.storageKey,
      sourceFilename: anexo.nomeArquivo,
    });
    status = result.status;
    mensagem = result.mensagem;
  } catch (e) {
    status = "fail";
    mensagem = e instanceof Error ? e.message : "Falha no adapter";
  }

  const updatedAt = new Date().toISOString();
  await db.run(
    `UPDATE cam_jobs SET status = ?, mensagem = ?, updated_at = ? WHERE clinica_id = ? AND id = ?`,
    [status, mensagem ?? null, updatedAt, opts.clinicaId, jobId],
  );

  const row = await db.queryOne("SELECT * FROM cam_jobs WHERE clinica_id = ? AND id = ?", [
    opts.clinicaId,
    jobId,
  ]);
  return mapCamJob(row!);
}

export async function listCamJobs(
  db: LabDbClient,
  clinicaId: number,
  pacienteId?: string,
) {
  if (pacienteId) {
    const rows = await db.queryAll(
      `SELECT * FROM cam_jobs WHERE clinica_id = ? AND paciente_id = ? ORDER BY created_at DESC`,
      [clinicaId, pacienteId],
    );
    return rows.map(mapCamJob);
  }
  const rows = await db.queryAll(
    `SELECT * FROM cam_jobs WHERE clinica_id = ? ORDER BY created_at DESC LIMIT 100`,
    [clinicaId],
  );
  return rows.map(mapCamJob);
}
