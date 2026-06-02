import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { getClinicaId } from "./helpers.js";

export const clientesRouter = Router();

clientesRouter.get("/", requirePolicy("clientes", "read"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 0, 500) || undefined;
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  await withLabClient(getClinicaId(req), async (db) => {
    let sql = "SELECT * FROM clientes WHERE clinica_id = ? ORDER BY nome";
    const params: unknown[] = [getClinicaId(req)];
    if (limit) {
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    const rows = await db.queryAll(sql, params);
    const mapped = rows.map(mapCliente);
    if (limit) {
      const countRow = await db.queryOne<{ c: number }>(
        "SELECT COUNT(*) as c FROM clientes WHERE clinica_id = ?",
        [getClinicaId(req)],
      );
      return res.json({
        items: mapped,
        total: Number(countRow?.c ?? 0),
        limit,
        offset,
      });
    }
    res.json(mapped);
  });
});

clientesRouter.get("/:id", requirePolicy("clientes", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [getClinicaId(req), req.params.id]);
    if (!row) return res.status(404).json({ erro: "Cliente não encontrado" });
    res.json(mapCliente(row));
  });
});

/** Upsert de paciente vindo do ERP (Excellence Dental). */
clientesRouter.post("/sync-erp", requirePolicy("clientes", "write"), async (req, res) => {
  const { erpPacienteId, nome, cpf, telefone, email, endereco, observacoes } = req.body;
  if (!erpPacienteId || !nome) {
    return res.status(400).json({ erro: "erpPacienteId e nome são obrigatórios" });
  }
  const cid = getClinicaId(req);
  const erpId = String(erpPacienteId);
  const stableId = `erp-${cid}-${erpId}`;

  await withLabClient(cid, async (db) => {
    const existing = await db.queryOne<Record<string, string>>(
      `SELECT id FROM clientes WHERE clinica_id = ? AND (id = ? OR erp_paciente_id = ?)`,
      [cid, stableId, erpId],
    );
    if (existing) {
      await db.run(
        `UPDATE clientes SET nome=?, cpf=?, telefone=?, email=?, endereco=?, observacoes=?, erp_paciente_id=?
         WHERE clinica_id=? AND id=?`,
        [
          nome,
          cpf ?? null,
          telefone ?? null,
          email ?? null,
          endereco ?? null,
          observacoes ?? null,
          erpId,
          cid,
          existing.id,
        ],
      );
      const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [cid, existing.id]);
      return res.json({ ...mapCliente(row!), synced: true, created: false });
    }

    await db.run(
      `INSERT INTO clientes (id, clinica_id, nome, cpf, telefone, email, endereco, observacoes, erp_paciente_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stableId,
        cid,
        nome,
        cpf ?? null,
        telefone ?? null,
        email ?? null,
        endereco ?? null,
        observacoes ?? null,
        erpId,
      ],
    );
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [cid, stableId]);
    res.status(201).json({ ...mapCliente(row!), synced: true, created: true });
  });
});

clientesRouter.post("/", requirePolicy("clientes", "write"), async (req, res) => {
  const id = newId();
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome é obrigatório" });
  await withLabClient(getClinicaId(req), async (db) => {
    await db.run(
      `INSERT INTO clientes (id, clinica_id, nome, cpf, telefone, email, endereco, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, getClinicaId(req), nome, cpf ?? null, telefone ?? null, email ?? null, endereco ?? null, observacoes ?? null],
    );
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [getClinicaId(req), id]);
    res.status(201).json(mapCliente(row!));
  });
});

clientesRouter.put("/:id", requirePolicy("clientes", "write"), async (req, res) => {
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run(
      `UPDATE clientes SET nome=?, cpf=?, telefone=?, email=?, endereco=?, observacoes=?
       WHERE clinica_id=? AND id=?`,
      [nome, cpf ?? null, telefone ?? null, email ?? null, endereco ?? null, observacoes ?? null, getClinicaId(req), req.params.id],
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    res.json(mapCliente(row!));
  });
});

clientesRouter.delete("/:id", requirePolicy("clientes", "delete"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const result = await db.run("DELETE FROM clientes WHERE clinica_id = ? AND id = ?", [getClinicaId(req), req.params.id]);
    if (result.changes === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
    res.status(204).send();
  });
});

function mapCliente(row: Record<string, unknown>) {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    email: row.email,
    endereco: row.endereco,
    observacoes: row.observacoes,
    erpPacienteId: row.erp_paciente_id,
    createdAt: row.created_at,
  };
}
