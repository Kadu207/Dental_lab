import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { STATUS_FLOW } from "@dental/labels";
import { getClinicaId } from "./helpers.js";

export const dashboardRouter = Router();

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

dashboardRouter.get("/kpis", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const hoje = hojeIso();
    const rows = await db.queryAll<Record<string, unknown>>(
      "SELECT status, setor, data_entrada, data_prevista_entrega FROM proteses WHERE clinica_id = ?",
      [getClinicaId(req)],
    );

    const porStatus: Record<string, number> = {};
    for (const s of STATUS_FLOW) porStatus[s] = 0;

    const porSetor: Record<string, number> = { gesso: 0, ceramica: 0, acabamento: 0, entrega: 0 };
    let hojeEntrada = 0;
    let atrasados = 0;
    let prontos = 0;

    for (const row of rows) {
      const status = String(row.status ?? "");
      if (porStatus[status] !== undefined) porStatus[status]++;
      else porStatus[status] = (porStatus[status] ?? 0) + 1;

      const setor = String(row.setor ?? "gesso");
      porSetor[setor] = (porSetor[setor] ?? 0) + 1;

      if (String(row.data_entrada ?? "") === hoje) hojeEntrada++;
      if (status === "pronto") prontos++;

      const prev = row.data_prevista_entrega ? String(row.data_prevista_entrega) : "";
      if (prev && prev < hoje && status !== "entregue") atrasados++;
    }

    const alertas = await db.queryAll(
      "SELECT id FROM estoque WHERE clinica_id = ? AND quantidade <= quantidade_minima",
      [getClinicaId(req)],
    );

    res.json({
      total: rows.length,
      hojeEntrada,
      atrasados,
      prontos,
      porStatus,
      porSetor,
      estoqueAlertas: alertas.length,
      geradoEm: new Date().toISOString(),
    });
  });
});
