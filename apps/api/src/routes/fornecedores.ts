import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { getClinicaId } from "./helpers.js";

export const fornecedoresRouter = Router();

fornecedoresRouter.get("/", requirePolicy("fornecedores", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const rows = await db.queryAll("SELECT * FROM fornecedores WHERE clinica_id = ? ORDER BY razao_social", [
      getClinicaId(req),
    ]);
    res.json(rows.map(mapFornecedor));
  });
});

fornecedoresRouter.get("/:id", requirePolicy("fornecedores", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM fornecedores WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Fornecedor não encontrado" });
    res.json(mapFornecedor(row));
  });
});

fornecedoresRouter.post("/", requirePolicy("fornecedores", "write"), async (req, res) => {
  const id = newId();
  const { razaoSocial, nomeFantasia, cnpj, telefone, email, contato, endereco, observacoes } = req.body;
  if (!razaoSocial) return res.status(400).json({ erro: "Razão social é obrigatória" });
  await withLabClient(getClinicaId(req), async (db) => {
    await db.run(
      `INSERT INTO fornecedores (id, clinica_id, razao_social, nome_fantasia, cnpj, telefone, email, contato, endereco, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        getClinicaId(req),
        razaoSocial,
        nomeFantasia ?? null,
        cnpj ?? null,
        telefone ?? null,
        email ?? null,
        contato ?? null,
        endereco ?? null,
        observacoes ?? null,
      ],
    );
    const row = await db.queryOne("SELECT * FROM fornecedores WHERE clinica_id = ? AND id = ?", [getClinicaId(req), id]);
    res.status(201).json(mapFornecedor(row!));
  });
});

fornecedoresRouter.put("/:id", requirePolicy("fornecedores", "write"), async (req, res) => {
  const { razaoSocial, nomeFantasia, cnpj, telefone, email, contato, endereco, observacoes } = req.body;
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run(
      `UPDATE fornecedores SET razao_social=?, nome_fantasia=?, cnpj=?, telefone=?, email=?, contato=?, endereco=?, observacoes=?
       WHERE clinica_id=? AND id=?`,
      [
        razaoSocial,
        nomeFantasia ?? null,
        cnpj ?? null,
        telefone ?? null,
        email ?? null,
        contato ?? null,
        endereco ?? null,
        observacoes ?? null,
        getClinicaId(req),
        req.params.id,
      ],
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Fornecedor não encontrado" });
    const row = await db.queryOne("SELECT * FROM fornecedores WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    res.json(mapFornecedor(row!));
  });
});

fornecedoresRouter.delete("/:id", requirePolicy("fornecedores", "delete"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run("DELETE FROM fornecedores WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (result.changes === 0) return res.status(404).json({ erro: "Fornecedor não encontrado" });
    res.status(204).send();
  });
});

function mapFornecedor(row: Record<string, unknown>) {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    telefone: row.telefone,
    email: row.email,
    contato: row.contato,
    endereco: row.endereco,
    observacoes: row.observacoes,
    createdAt: row.created_at,
  };
}
