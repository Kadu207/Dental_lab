import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { ensurePacientePasta } from "../cam/pasta-service.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { getClinicaId } from "./helpers.js";

export const clientesRouter = Router();

clientesRouter.get("/", requirePolicy("clientes", "read"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 0, 500) || undefined;
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
  await withLabClient(getClinicaId(req), async (db) => {
    const cid = getClinicaId(req);
    let where = "clinica_id = ?";
    const params: unknown[] = [cid];
    if (qRaw) {
      const like = `%${qRaw}%`;
      where += " AND (nome LIKE ? OR COALESCE(cpf,'') LIKE ? OR COALESCE(telefone,'') LIKE ?)";
      params.push(like, like, like);
    }
    let sql = `SELECT * FROM clientes WHERE ${where} ORDER BY nome`;
    if (limit) {
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    const rows = await db.queryAll(sql, params);
    const mapped = rows.map(mapCliente);
    if (limit) {
      const countParams: unknown[] = [cid];
      let countSql = "SELECT COUNT(*) as c FROM clientes WHERE clinica_id = ?";
      if (qRaw) {
        const like = `%${qRaw}%`;
        countSql += " AND (nome LIKE ? OR COALESCE(cpf,'') LIKE ? OR COALESCE(telefone,'') LIKE ?)";
        countParams.push(like, like, like);
      }
      const countRow = await db.queryOne<{ c: number }>(countSql, countParams);
      return res.json({
        items: mapped,
        total: Number(countRow?.c ?? 0),
        limit,
        offset,
        q: qRaw || undefined,
      });
    }
    res.json(mapped);
  });
});

clientesRouter.get("/:id/ficha", requirePolicy("clientes", "read"), async (req, res) => {
  const cid = getClinicaId(req);
  const id = req.params.id;
  await withLabClient(cid, async (db) => {
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [cid, id]);
    if (!row) return res.status(404).json({ erro: "Cliente nÃ£o encontrado" });
    const proteses = await db.queryAll(
      `SELECT id, codigo, codigo_barras, tipo_protese, status, setor, data_entrada, data_prevista_entrega
       FROM proteses WHERE clinica_id = ? AND paciente_id = ?
       ORDER BY data_entrada DESC, codigo DESC`,
      [cid, id],
    );
    res.json({
      paciente: mapCliente(row),
      proteses: proteses.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        codigoBarras: p.codigo_barras,
        tipoProtese: p.tipo_protese,
        status: p.status,
        setor: p.setor,
        dataEntrada: p.data_entrada,
        dataPrevistaEntrega: p.data_prevista_entrega,
      })),
    });
  });
});

clientesRouter.get("/:id", requirePolicy("clientes", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [getClinicaId(req), req.params.id]);
    if (!row) return res.status(404).json({ erro: "Cliente nÃ£o encontrado" });
    res.json(mapCliente(row));
  });
});

/** Upsert de paciente vindo do ERP (Excellence Dental). */
clientesRouter.post("/sync-erp", requirePolicy("clientes", "write"), async (req, res) => {
  const { erpPacienteId, nome, cpf, telefone, email, endereco, observacoes } = req.body;
  if (!erpPacienteId || !nome) {
    return res.status(400).json({ erro: "erpPacienteId e nome sÃ£o obrigatÃ³rios" });
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
    await ensurePacientePasta(db, cid, stableId);
    res.status(201).json({ ...mapCliente(row!), synced: true, created: true });
  });
});

clientesRouter.post("/", requirePolicy("clientes", "write"), async (req, res) => {
  const id = newId();
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome Ã© obrigatÃ³rio" });
  await withLabClient(getClinicaId(req), async (db) => {
    const clinicaId = getClinicaId(req);
    await db.run(
      `INSERT INTO clientes (id, clinica_id, nome, cpf, telefone, email, endereco, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clinicaId, nome, cpf ?? null, telefone ?? null, email ?? null, endereco ?? null, observacoes ?? null],
    );
    await ensurePacientePasta(db, clinicaId, id);
    const row = await db.queryOne("SELECT * FROM clientes WHERE clinica_id = ? AND id = ?", [clinicaId, id]);
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
    if (result.changes === 0) return res.status(404).json({ erro: "Cliente nÃ£o encontrado" });
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
    if (result.changes === 0) return res.status(404).json({ erro: "Cliente nÃ£o encontrado" });
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
