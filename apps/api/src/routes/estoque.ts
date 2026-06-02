import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { getClinicaId } from "./helpers.js";

export const estoqueRouter = Router();

estoqueRouter.get("/", requirePolicy("estoque", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const rows = await db.queryAll("SELECT * FROM estoque WHERE clinica_id = ? ORDER BY descricao", [getClinicaId(req)]);
    res.json(rows.map(mapEstoque));
  });
});

estoqueRouter.get("/alertas", requirePolicy("estoque", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const rows = await db.queryAll(
      "SELECT * FROM estoque WHERE clinica_id = ? AND quantidade <= quantidade_minima ORDER BY descricao",
      [getClinicaId(req)],
    );
    res.json(rows.map(mapEstoque));
  });
});

estoqueRouter.get("/:id", requirePolicy("estoque", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM estoque WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Item não encontrado" });
    res.json(mapEstoque(row));
  });
});

estoqueRouter.post("/", requirePolicy("estoque", "write"), async (req, res) => {
  const id = newId();
  const { codigo, descricao, categoria, unidade, quantidade, quantidadeMinima, fornecedorId, precoUnitario, localizacao } =
    req.body;
  if (!codigo || !descricao) return res.status(400).json({ erro: "Código e descrição são obrigatórios" });
  try {
    await withLabClient(getClinicaId(req), async (db) => {
      await db.run(
        `INSERT INTO estoque (id, clinica_id, codigo, descricao, categoria, unidade, quantidade, quantidade_minima, fornecedor_id, preco_unitario, localizacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          getClinicaId(req),
          codigo,
          descricao,
          categoria ?? "Geral",
          unidade ?? "un",
          quantidade ?? 0,
          quantidadeMinima ?? 0,
          fornecedorId ?? null,
          precoUnitario ?? null,
          localizacao ?? null,
        ],
      );
      const row = await db.queryOne("SELECT * FROM estoque WHERE clinica_id = ? AND id = ?", [getClinicaId(req), id]);
      res.status(201).json(mapEstoque(row!));
    });
  } catch {
    res.status(409).json({ erro: "Código já existe" });
  }
});

estoqueRouter.put("/:id", requirePolicy("estoque", "write"), async (req, res) => {
  const { codigo, descricao, categoria, unidade, quantidade, quantidadeMinima, fornecedorId, precoUnitario, localizacao } =
    req.body;
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run(
      `UPDATE estoque SET codigo=?, descricao=?, categoria=?, unidade=?, quantidade=?, quantidade_minima=?, fornecedor_id=?, preco_unitario=?, localizacao=?
       WHERE clinica_id=? AND id=?`,
      [
        codigo,
        descricao,
        categoria,
        unidade,
        quantidade,
        quantidadeMinima,
        fornecedorId ?? null,
        precoUnitario ?? null,
        localizacao ?? null,
        getClinicaId(req),
        req.params.id,
      ],
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Item não encontrado" });
    const row = await db.queryOne("SELECT * FROM estoque WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    res.json(mapEstoque(row!));
  });
});

estoqueRouter.patch("/:id/movimentar", requirePolicy("estoque", "write"), async (req, res) => {
  const { quantidade, tipo } = req.body as { quantidade: number; tipo: "entrada" | "saida" };
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne<Record<string, number>>("SELECT * FROM estoque WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Item não encontrado" });
    const novaQtd = tipo === "entrada" ? Number(row.quantidade) + quantidade : Number(row.quantidade) - quantidade;
    if (novaQtd < 0) return res.status(400).json({ erro: "Quantidade insuficiente" });
    await db.run("UPDATE estoque SET quantidade = ? WHERE clinica_id = ? AND id = ?", [novaQtd, getClinicaId(req), req.params.id]);
    const updated = await db.queryOne("SELECT * FROM estoque WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    res.json(mapEstoque(updated!));
  });
});

estoqueRouter.delete("/:id", requirePolicy("estoque", "delete"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run("DELETE FROM estoque WHERE clinica_id = ? AND id = ?", [getClinicaId(req), req.params.id]);
    if (result.changes === 0) return res.status(404).json({ erro: "Item não encontrado" });
    res.status(204).send();
  });
});

function mapEstoque(row: Record<string, unknown>) {
  return {
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    categoria: row.categoria,
    unidade: row.unidade,
    quantidade: row.quantidade,
    quantidadeMinima: row.quantidade_minima,
    fornecedorId: row.fornecedor_id,
    precoUnitario: row.preco_unitario,
    localizacao: row.localizacao,
    createdAt: row.created_at,
  };
}
