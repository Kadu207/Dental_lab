import express, { Router, type Request } from "express";
import fs from "fs/promises";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { emitIntegrationEvent } from "../integracoes/emit.js";
import { getClinicaId } from "../routes/helpers.js";
import { createAndSendCamJob, listCamJobs } from "./jobs-service.js";
import {
  ensurePacientePasta,
  getAnexoRow,
  listAnexos,
  mapAnexo,
  saveAnexoFromBuffer,
  type AnexoTipo,
} from "./pasta-service.js";
import { listCamAdapters } from "./registry.js";
import type { CamCapability } from "./types.js";

export const pastaPacienteRouter = Router({ mergeParams: true });
export const camRouter = Router();

function cid(req: Request) {
  return getClinicaId(req);
}

function paramId(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

pastaPacienteRouter.get("/:id/pasta", requirePolicy("clientes", "read"), async (req, res) => {
  const pacienteId = paramId(req, "id");
  await withLabClient(cid(req), async (db) => {
    const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [
      cid(req),
      pacienteId,
    ]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });
    const pasta = await ensurePacientePasta(db, cid(req), pacienteId);
    const anexos = await listAnexos(db, cid(req), pacienteId);
    res.json({ pasta, anexos });
  });
});

pastaPacienteRouter.get("/:id/pasta/anexos", requirePolicy("clientes", "read"), async (req, res) => {
  const pacienteId = paramId(req, "id");
  await withLabClient(cid(req), async (db) => {
    const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [
      cid(req),
      pacienteId,
    ]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });
    await ensurePacientePasta(db, cid(req), pacienteId);
    res.json(await listAnexos(db, cid(req), pacienteId));
  });
});

pastaPacienteRouter.post(
  "/:id/pasta/anexos",
  requirePolicy("clientes", "write"),
  express.raw({ type: () => true, limit: "80mb" }),
  async (req, res) => {
    const pacienteId = paramId(req, "id");
    const filename = String(req.headers["x-filename"] ?? req.query.filename ?? "").trim();
    if (!filename) {
      return res.status(400).json({ erro: "Informe X-Filename com o nome do arquivo" });
    }
    const tipoRaw = String(req.headers["x-anexo-tipo"] ?? req.query.tipo ?? "scan").toLowerCase();
    const tipo: AnexoTipo =
      tipoRaw === "anexo" || tipoRaw === "job_output" ? (tipoRaw as AnexoTipo) : "scan";
    const proteseIdRaw = String(req.headers["x-protese-id"] ?? req.query.proteseId ?? "").trim();
    const mime = String(req.headers["content-type"] ?? "application/octet-stream");
    const body = req.body;
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body ?? []);
    if (buffer.length === 0) {
      return res.status(400).json({ erro: "Corpo do arquivo vazio" });
    }

    try {
      const result = await withLabClient(cid(req), async (db) =>
        saveAnexoFromBuffer(db, {
          clinicaId: cid(req),
          pacienteId,
          buffer,
          filename,
          mime,
          tipo,
          proteseId: proteseIdRaw || null,
        }),
      );
      emitIntegrationEvent("cam_asset_imported", {
        clinicaId: cid(req),
        pacienteId,
        anexoId: result.anexo.id,
        tipo,
        nomeArquivo: result.anexo.nomeArquivo,
      });
      res.status(201).json(result.anexo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha no upload";
      if (msg === "PACIENTE_NOT_FOUND") return res.status(404).json({ erro: "Paciente não encontrado" });
      if (msg === "PROTESE_NOT_FOUND") return res.status(404).json({ erro: "Prótese não encontrada" });
      res.status(400).json({ erro: msg });
    }
  },
);

pastaPacienteRouter.get(
  "/:id/pasta/anexos/:anexoId/download",
  requirePolicy("clientes", "read"),
  async (req, res) => {
    const pacienteId = paramId(req, "id");
    const anexoId = paramId(req, "anexoId");
    await withLabClient(cid(req), async (db) => {
      const row = await getAnexoRow(db, cid(req), pacienteId, anexoId);
      if (!row) return res.status(404).json({ erro: "Anexo não encontrado" });
      const anexo = mapAnexo(row);
      try {
        await fs.access(anexo.storageKey);
      } catch {
        return res.status(404).json({ erro: "Arquivo ausente no storage" });
      }
      res.setHeader("Content-Type", anexo.mime || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${anexo.nomeArquivo.replace(/"/g, "")}"`,
      );
      const data = await fs.readFile(anexo.storageKey);
      res.send(data);
    });
  },
);

pastaPacienteRouter.get("/:id/pasta/jobs", requirePolicy("clientes", "read"), async (req, res) => {
  const pacienteId = paramId(req, "id");
  await withLabClient(cid(req), async (db) => {
    const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [
      cid(req),
      pacienteId,
    ]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });
    res.json(await listCamJobs(db, cid(req), pacienteId));
  });
});

camRouter.get("/adapters", requirePolicy("proteses", "read"), (_req, res) => {
  res.json(listCamAdapters());
});

camRouter.get("/jobs", requirePolicy("proteses", "read"), async (req, res) => {
  const pacienteId = typeof req.query.pacienteId === "string" ? req.query.pacienteId : undefined;
  await withLabClient(cid(req), async (db) => {
    res.json(await listCamJobs(db, cid(req), pacienteId));
  });
});

camRouter.post("/jobs", requirePolicy("proteses", "write"), async (req, res) => {
  const pacienteId = String(req.body?.pacienteId ?? "").trim();
  const anexoId = String(req.body?.anexoId ?? "").trim();
  const adapterId = String(req.body?.adapterId ?? "filesystem").trim();
  const capability = String(req.body?.capability ?? "print").toLowerCase() as CamCapability;
  const perfil = req.body?.perfil != null ? String(req.body.perfil) : null;
  const proteseId = req.body?.proteseId != null ? String(req.body.proteseId) : null;

  if (!pacienteId || !anexoId) {
    return res.status(400).json({ erro: "pacienteId e anexoId são obrigatórios" });
  }
  if (capability !== "print" && capability !== "mill" && capability !== "ingest") {
    return res.status(400).json({ erro: "capability inválida" });
  }

  try {
    const job = await withLabClient(cid(req), async (db) =>
      createAndSendCamJob(db, {
        clinicaId: cid(req),
        pacienteId,
        anexoId,
        adapterId,
        capability,
        perfil,
        proteseId,
      }),
    );
    emitIntegrationEvent("cam_job_done", {
      clinicaId: cid(req),
      jobId: job.id,
      status: job.status,
      adapterId: job.adapterId,
    });
    res.status(201).json(job);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar job";
    const map: Record<string, number> = {
      ADAPTER_NOT_FOUND: 404,
      ADAPTER_CAPABILITY_MISMATCH: 400,
      ANEXO_NOT_FOUND: 404,
      ANEXO_FILE_MISSING: 404,
      PROTESE_NOT_FOUND: 404,
    };
    res.status(map[msg] ?? 400).json({ erro: msg });
  }
});
