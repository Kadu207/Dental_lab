import { Router, type Request } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";

export const financeiroRouter = Router();

const TIPOS = ["Entrada", "Saída", "Receita", "Despesa"];
const STATUS = ["Pendente", "Recebido", "Pago", "Inadimplente", "Cancelado"];

function cid(req: Request) {
  return req.auth!.clinicaId;
}

financeiroRouter.get("/", requirePolicy("financeiro", "read"), async (req, res) => {
  const status = req.query.status as string | undefined;
  await withLabClient(cid(req), async (db) => {
    let sql = "SELECT * FROM financeiro WHERE clinica_id = ?";
    const params: unknown[] = [cid(req)];
    if (status && status !== "Todos") {
      sql += " AND lower(status) = lower(?)";
      params.push(status);
    }
    sql += " ORDER BY data_vencimento DESC, created_at DESC";
    const rows = await db.queryAll(sql, params);
    res.json(rows.map(mapFin));
  });
});

financeiroRouter.post("/", requirePolicy("financeiro", "write"), async (req, res) => {
  const { tipo, descricao, valor, dataVencimento, data_vencimento, status, formaPagamento, forma_pagamento } =
    req.body;
  if (!tipo || !descricao) return res.status(400).json({ erro: "Tipo e descrição são obrigatórios" });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: "Tipo inválido", validos: TIPOS });
  const id = newId();
  const dv = dataVencimento ?? data_vencimento ?? new Date().toISOString().slice(0, 10);
  const st = status && STATUS.includes(status) ? status : "Pendente";
  await withLabClient(cid(req), async (db) => {
    await db.run(
      `INSERT INTO financeiro (id, clinica_id, tipo, descricao, valor, data_vencimento, status, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, cid(req), tipo, descricao, Number(valor) || 0, dv, st, formaPagamento ?? forma_pagamento ?? null],
    );
    const row = await db.queryOne("SELECT * FROM financeiro WHERE id = ?", [id]);
    res.status(201).json(mapFin(row!));
  });
});

financeiroRouter.put("/:id", requirePolicy("financeiro", "write"), async (req, res) => {
  const { tipo, descricao, valor, dataVencimento, data_vencimento, status, formaPagamento, forma_pagamento } =
    req.body;
  await withLabClient(cid(req), async (db) => {
    const r = await db.run(
      `UPDATE financeiro SET tipo=?, descricao=?, valor=?, data_vencimento=?, status=?, forma_pagamento=?
       WHERE clinica_id=? AND id=?`,
      [
        tipo,
        descricao,
        Number(valor) || 0,
        dataVencimento ?? data_vencimento,
        status,
        formaPagamento ?? forma_pagamento ?? null,
        cid(req),
        req.params.id,
      ],
    );
    if (r.changes === 0) return res.status(404).json({ erro: "Lançamento não encontrado" });
    const row = await db.queryOne("SELECT * FROM financeiro WHERE id = ?", [req.params.id]);
    res.json(mapFin(row!));
  });
});

financeiroRouter.delete("/:id", requirePolicy("financeiro", "delete"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("DELETE FROM financeiro WHERE clinica_id = ? AND id = ?", [cid(req), req.params.id]);
    if (r.changes === 0) return res.status(404).json({ erro: "Lançamento não encontrado" });
    res.status(204).send();
  });
});

function mapFin(row: Record<string, unknown>) {
  const valor = Number(row.valor);
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao,
    valor,
    dataVencimento: row.data_vencimento,
    status: row.status,
    formaPagamento: row.forma_pagamento,
    createdAt: row.created_at,
  };
}
