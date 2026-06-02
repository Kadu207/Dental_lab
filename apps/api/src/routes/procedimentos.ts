import { Router, type Request } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";

export const procedimentosRouter = Router();

function cid(req: Request) {
  return req.auth!.clinicaId;
}

procedimentosRouter.get("/", requirePolicy("procedimentos", "read"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll("SELECT * FROM procedimentos WHERE clinica_id = ? ORDER BY nome", [cid(req)]);
    res.json(rows.map(mapProc));
  });
});

procedimentosRouter.post("/", requirePolicy("procedimentos", "write"), async (req, res) => {
  const { nome, valor, custoEstimado, custo_estimado, geraComissao, gera_comissao, comissaoPerc, comissao_perc } =
    req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: "Nome é obrigatório" });
  const id = newId();
  const gc = (geraComissao ?? gera_comissao ?? "Não") === "Sim" ? "Sim" : "Não";
  try {
    await withLabClient(cid(req), async (db) => {
      await db.run(
        `INSERT INTO procedimentos (id, clinica_id, nome, valor, custo_estimado, gera_comissao, comissao_perc)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cid(req),
          nome.trim(),
          Number(valor) || 0,
          Number(custoEstimado ?? custo_estimado) || 0,
          gc,
          Number(comissaoPerc ?? comissao_perc) || 0,
        ],
      );
      const row = await db.queryOne("SELECT * FROM procedimentos WHERE clinica_id = ? AND id = ?", [cid(req), id]);
      res.status(201).json(mapProc(row!));
    });
  } catch {
    res.status(409).json({ erro: "Procedimento já cadastrado" });
  }
});

procedimentosRouter.put("/:id", requirePolicy("procedimentos", "write"), async (req, res) => {
  const { nome, valor, custoEstimado, custo_estimado, geraComissao, gera_comissao, comissaoPerc, comissao_perc } =
    req.body;
  const gc = geraComissao ?? gera_comissao;
  await withLabClient(cid(req), async (db) => {
    const r = await db.run(
      `UPDATE procedimentos SET nome=?, valor=?, custo_estimado=?, gera_comissao=?, comissao_perc=?
       WHERE clinica_id=? AND id=?`,
      [
        nome,
        Number(valor) || 0,
        Number(custoEstimado ?? custo_estimado) || 0,
        gc === "Sim" ? "Sim" : "Não",
        Number(comissaoPerc ?? comissao_perc) || 0,
        cid(req),
        req.params.id,
      ],
    );
    if (r.changes === 0) return res.status(404).json({ erro: "Procedimento não encontrado" });
    const row = await db.queryOne("SELECT * FROM procedimentos WHERE clinica_id = ? AND id = ?", [
      cid(req),
      req.params.id,
    ]);
    res.json(mapProc(row!));
  });
});

procedimentosRouter.delete("/:id", requirePolicy("procedimentos", "delete"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("DELETE FROM procedimentos WHERE clinica_id = ? AND id = ?", [cid(req), req.params.id]);
    if (r.changes === 0) return res.status(404).json({ erro: "Procedimento não encontrado" });
    res.status(204).send();
  });
});

function mapProc(row: Record<string, unknown>) {
  const valor = Number(row.valor);
  const custo = Number(row.custo_estimado);
  return {
    id: row.id,
    nome: row.nome,
    valor,
    custoEstimado: custo,
    geraComissao: row.gera_comissao,
    comissaoPerc: Number(row.comissao_perc),
    margemEstimada: valor - custo,
    createdAt: row.created_at,
  };
}
