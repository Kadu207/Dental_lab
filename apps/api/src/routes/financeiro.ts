import { Router, type Request } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import {
  buildFinanceiroFilters,
  FINANCEIRO_STATUS,
  FINANCEIRO_TIPOS,
  summarizeFinanceiro,
} from "../financeiro/query.js";

export const financeiroRouter = Router();

function cid(req: Request) {
  return req.auth!.clinicaId;
}

function parseListQuery(req: Request) {
  return {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    de: typeof req.query.de === "string" ? req.query.de : undefined,
    ate: typeof req.query.ate === "string" ? req.query.ate : undefined,
    pacienteId:
      typeof req.query.pacienteId === "string"
        ? req.query.pacienteId
        : typeof req.query.paciente_id === "string"
          ? req.query.paciente_id
          : undefined,
    proteseId:
      typeof req.query.proteseId === "string"
        ? req.query.proteseId
        : typeof req.query.protese_id === "string"
          ? req.query.protese_id
          : undefined,
  };
}

async function assertVinculos(
  db: { queryOne: (sql: string, params?: unknown[]) => Promise<Record<string, unknown> | undefined> },
  clinicaId: number,
  pacienteId: string | null | undefined,
  proteseId: string | null | undefined,
) {
  if (pacienteId) {
    const p = await db.queryOne("SELECT id FROM clientes WHERE clinica_id = ? AND id = ?", [
      clinicaId,
      pacienteId,
    ]);
    if (!p) throw new Error("PACIENTE_NOT_FOUND");
  }
  if (proteseId) {
    const pr = await db.queryOne<{ id: string; paciente_id: string | null }>(
      "SELECT id, paciente_id FROM proteses WHERE clinica_id = ? AND id = ?",
      [clinicaId, proteseId],
    );
    if (!pr) throw new Error("PROTESE_NOT_FOUND");
    if (pacienteId && pr.paciente_id && pr.paciente_id !== pacienteId) {
      throw new Error("PROTESE_PACIENTE_MISMATCH");
    }
  }
}

financeiroRouter.get("/resumo", requirePolicy("financeiro", "read"), async (req, res) => {
  const q = parseListQuery(req);
  const filters = buildFinanceiroFilters(q);
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll<{ tipo: string; valor: number; status: string }>(
      `SELECT tipo, valor, status FROM financeiro WHERE clinica_id = ?${filters.sql}`,
      [cid(req), ...filters.params],
    );
    res.json({
      ...summarizeFinanceiro(rows),
      filtros: q,
    });
  });
});

financeiroRouter.get("/", requirePolicy("financeiro", "read"), async (req, res) => {
  const q = parseListQuery(req);
  const filters = buildFinanceiroFilters(q);
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll(
      `SELECT * FROM financeiro WHERE clinica_id = ?${filters.sql}
       ORDER BY data_vencimento DESC, created_at DESC`,
      [cid(req), ...filters.params],
    );
    res.json(rows.map(mapFin));
  });
});

financeiroRouter.post("/", requirePolicy("financeiro", "write"), async (req, res) => {
  const {
    tipo,
    descricao,
    valor,
    dataVencimento,
    data_vencimento,
    status,
    formaPagamento,
    forma_pagamento,
    pacienteId,
    paciente_id,
    proteseId,
    protese_id,
  } = req.body;
  if (!tipo || !descricao) return res.status(400).json({ erro: "Tipo e descrição são obrigatórios" });
  if (!(FINANCEIRO_TIPOS as readonly string[]).includes(tipo)) {
    return res.status(400).json({ erro: "Tipo inválido", validos: FINANCEIRO_TIPOS });
  }
  const id = newId();
  const dv = dataVencimento ?? data_vencimento ?? new Date().toISOString().slice(0, 10);
  const st =
    status && (FINANCEIRO_STATUS as readonly string[]).includes(status) ? status : "Pendente";
  const pac = (pacienteId ?? paciente_id ?? null) as string | null;
  const prot = (proteseId ?? protese_id ?? null) as string | null;

  try {
    await withLabClient(cid(req), async (db) => {
      await assertVinculos(db, cid(req), pac, prot);
      await db.run(
        `INSERT INTO financeiro
         (id, clinica_id, tipo, descricao, valor, data_vencimento, status, forma_pagamento, paciente_id, protese_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cid(req),
          tipo,
          descricao,
          Number(valor) || 0,
          dv,
          st,
          formaPagamento ?? forma_pagamento ?? null,
          pac,
          prot,
        ],
      );
      const row = await db.queryOne("SELECT * FROM financeiro WHERE clinica_id = ? AND id = ?", [
        cid(req),
        id,
      ]);
      res.status(201).json(mapFin(row!));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao criar";
    const code =
      msg === "PACIENTE_NOT_FOUND" || msg === "PROTESE_NOT_FOUND"
        ? 404
        : msg === "PROTESE_PACIENTE_MISMATCH"
          ? 400
          : 400;
    res.status(code).json({ erro: msg });
  }
});

financeiroRouter.put("/:id", requirePolicy("financeiro", "write"), async (req, res) => {
  const {
    tipo,
    descricao,
    valor,
    dataVencimento,
    data_vencimento,
    status,
    formaPagamento,
    forma_pagamento,
    pacienteId,
    paciente_id,
    proteseId,
    protese_id,
  } = req.body;

  if (tipo && !(FINANCEIRO_TIPOS as readonly string[]).includes(tipo)) {
    return res.status(400).json({ erro: "Tipo inválido", validos: FINANCEIRO_TIPOS });
  }
  if (status && !(FINANCEIRO_STATUS as readonly string[]).includes(status)) {
    return res.status(400).json({ erro: "Status inválido", validos: FINANCEIRO_STATUS });
  }

  const pac =
    pacienteId !== undefined || paciente_id !== undefined
      ? ((pacienteId ?? paciente_id ?? null) as string | null)
      : undefined;
  const prot =
    proteseId !== undefined || protese_id !== undefined
      ? ((proteseId ?? protese_id ?? null) as string | null)
      : undefined;

  try {
    await withLabClient(cid(req), async (db) => {
      const current = await db.queryOne("SELECT * FROM financeiro WHERE clinica_id = ? AND id = ?", [
        cid(req),
        req.params.id,
      ]);
      if (!current) return res.status(404).json({ erro: "Lançamento não encontrado" });

      const nextPac =
        pac !== undefined ? pac : ((current.paciente_id as string | null) ?? null);
      const nextProt =
        prot !== undefined ? prot : ((current.protese_id as string | null) ?? null);
      await assertVinculos(db, cid(req), nextPac, nextProt);

      const r = await db.run(
        `UPDATE financeiro SET tipo=?, descricao=?, valor=?, data_vencimento=?, status=?, forma_pagamento=?,
         paciente_id=?, protese_id=?
         WHERE clinica_id=? AND id=?`,
        [
          tipo ?? current.tipo,
          descricao ?? current.descricao,
          valor !== undefined ? Number(valor) || 0 : current.valor,
          dataVencimento ?? data_vencimento ?? current.data_vencimento,
          status ?? current.status,
          formaPagamento !== undefined || forma_pagamento !== undefined
            ? (formaPagamento ?? forma_pagamento ?? null)
            : current.forma_pagamento,
          nextPac,
          nextProt,
          cid(req),
          req.params.id,
        ],
      );
      if (r.changes === 0) return res.status(404).json({ erro: "Lançamento não encontrado" });
      const row = await db.queryOne("SELECT * FROM financeiro WHERE clinica_id = ? AND id = ?", [
        cid(req),
        req.params.id,
      ]);
      res.json(mapFin(row!));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao atualizar";
    const code =
      msg === "PACIENTE_NOT_FOUND" || msg === "PROTESE_NOT_FOUND"
        ? 404
        : msg === "PROTESE_PACIENTE_MISMATCH"
          ? 400
          : 400;
    res.status(code).json({ erro: msg });
  }
});

financeiroRouter.delete("/:id", requirePolicy("financeiro", "delete"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("DELETE FROM financeiro WHERE clinica_id = ? AND id = ?", [
      cid(req),
      req.params.id,
    ]);
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
    pacienteId: (row.paciente_id as string) ?? null,
    proteseId: (row.protese_id as string) ?? null,
    createdAt: row.created_at,
  };
}
