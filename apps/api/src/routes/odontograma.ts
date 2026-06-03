import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { getClinicaId } from "./helpers.js";

export const odontogramaRouter = Router();

type ToothPayload = { fdi: number; condition: string; note?: string };

function parseDentes(raw: unknown): ToothPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object" && typeof (x as ToothPayload).fdi === "number")
    .map((x) => ({
      fdi: Number((x as ToothPayload).fdi),
      condition: String((x as ToothPayload).condition ?? "sadio"),
      note: (x as ToothPayload).note ? String((x as ToothPayload).note) : undefined,
    }));
}

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
      dentes = parseDentes(JSON.parse(row.dentes));
    } catch {
      dentes = [];
    }
    res.json({ pacienteId, dentes, updatedAt: row.updated_at });
  });
});

odontogramaRouter.put("/:pacienteId", requirePolicy("odontograma", "write"), async (req, res) => {
  const cid = getClinicaId(req);
  const pacienteId = req.params.pacienteId;
  const dentes = parseDentes(req.body?.dentes ?? req.body);
  if (!dentes.length && req.body?.dentes !== undefined && !Array.isArray(req.body.dentes)) {
    return res.status(400).json({ erro: "Campo dentes deve ser um array" });
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
