import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import {
  OdontogramaValidationError,
  parseDentesLenient,
  resolveDentesPayload,
  type ToothPayload,
} from "../odontograma/tooth.js";
import { getClinicaId } from "./helpers.js";

export const odontogramaRouter = Router();

odontogramaRouter.get("/:pacienteId", requirePolicy("odontograma", "read"), async (req, res) => {
  const cid = getClinicaId(req);
  const pacienteId = req.params.pacienteId;
  await withLabClient(cid, async (db) => {
    const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [cid, pacienteId]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });

    const row = await db.queryOne<{ dentes: string; updated_at: string }>(
      "SELECT dentes, updated_at FROM odontograma WHERE clinica_id = ? AND paciente_id = ?",
      [cid, pacienteId],
    );
    if (!row) {
      return res.json({ pacienteId, dentes: [], updatedAt: null });
    }
    let dentes: ToothPayload[] = [];
    try {
      dentes = parseDentesLenient(JSON.parse(row.dentes));
    } catch {
      dentes = [];
    }
    res.json({ pacienteId, dentes, updatedAt: row.updated_at });
  });
});

odontogramaRouter.put("/:pacienteId", requirePolicy("odontograma", "write"), async (req, res) => {
  const cid = getClinicaId(req);
  const pacienteId = req.params.pacienteId;
  let dentes: ToothPayload[];
  try {
    dentes = resolveDentesPayload(req.body);
  } catch (err) {
    if (err instanceof OdontogramaValidationError) {
      return res.status(400).json({ erro: err.message });
    }
    throw err;
  }

  await withLabClient(cid, async (db) => {
    const paciente = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [cid, pacienteId]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });

    const json = JSON.stringify(dentes);
    const now = new Date().toISOString();
    const existing = await db.queryOne(
      "SELECT paciente_id FROM odontograma WHERE clinica_id = ? AND paciente_id = ?",
      [cid, pacienteId],
    );
    if (existing) {
      await db.run(
        "UPDATE odontograma SET dentes = ?, updated_at = ? WHERE clinica_id = ? AND paciente_id = ?",
        [json, now, cid, pacienteId],
      );
    } else {
      await db.run(
        "INSERT INTO odontograma (clinica_id, paciente_id, dentes, updated_at) VALUES (?, ?, ?, ?)",
        [cid, pacienteId, json, now],
      );
    }
    const row = await db.queryOne<{ updated_at: string }>(
      "SELECT updated_at FROM odontograma WHERE clinica_id = ? AND paciente_id = ?",
      [cid, pacienteId],
    );
    res.json({ pacienteId, dentes, updatedAt: row?.updated_at ?? new Date().toISOString() });
  });
});
