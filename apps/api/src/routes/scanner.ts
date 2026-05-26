import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { STATUS_FLOW, STATUS_LABELS, type StatusProtese } from "@dental/labels";
import { withLabClient } from "../db/client.js";
import { getClinicaId } from "./helpers.js";

export const scannerRouter = Router();

scannerRouter.post("/scan", requirePolicy("proteses", "read"), async (req, res) => {
  const { codigo } = req.body as { codigo: string };
  if (!codigo) return res.status(400).json({ erro: "Código é obrigatório" });

  const cid = getClinicaId(req);
  await withLabClient(cid, async (db) => {
    const row = await db.queryOne<Record<string, unknown>>(
      "SELECT * FROM proteses WHERE clinica_id = ? AND (codigo = ? OR codigo_barras = ?)",
      [cid, codigo.trim(), codigo.trim()],
    );
    if (!row) return res.status(404).json({ erro: "Código não encontrado", codigo });

    const paciente = await db.queryOne<{ nome: string }>(
      "SELECT nome FROM clientes WHERE clinica_id = ? AND id = ?",
      [cid, row.paciente_id as string],
    );
    const historico = await db.queryAll(
      "SELECT * FROM status_historico WHERE clinica_id = ? AND protese_id = ? ORDER BY created_at DESC LIMIT 10",
      [cid, row.id as string],
    );

    const statusAtual = row.status as StatusProtese;
    const proximoStatus = STATUS_FLOW[STATUS_FLOW.indexOf(statusAtual) + 1] ?? null;

    res.json({
      encontrado: true,
      protese: {
        id: row.id,
        codigo: row.codigo,
        paciente: paciente?.nome,
        dentista: row.dentista_nome,
        tipoProtese: row.tipo_protese,
        status: statusAtual,
        statusLabel: STATUS_LABELS[statusAtual],
        proximoStatus,
        proximoStatusLabel: proximoStatus ? STATUS_LABELS[proximoStatus] : null,
      },
      historico: historico.map((h: Record<string, unknown>) => ({
        status: h.status,
        statusLabel: STATUS_LABELS[h.status as StatusProtese],
        observacao: h.observacao,
        createdAt: h.created_at,
      })),
    });
  });
});

scannerRouter.get("/status-flow", requirePolicy("proteses", "read"), (_req, res) => {
  res.json(STATUS_FLOW.map((s) => ({ value: s, label: STATUS_LABELS[s] })));
});
