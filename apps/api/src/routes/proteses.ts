import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import {
  criarRegistroProtese,
  gerarCodigoProtese,
  gerarEtiquetas3Vias,
  renderHtmlImpressao,
  STATUS_FLOW,
  type ProteseRegistro,
  type StatusProtese,
  type TamanhoEtiqueta,
} from "@dental/labels";
import { withLabClient, type LabDbClient, type LabConfigDb } from "../db/client.js";
import { newId } from "../db/index.js";
import { getClinicaId } from "./helpers.js";

export const protesesRouter = Router();

const SETORES_VALIDOS = ["gesso", "ceramica", "acabamento", "entrega"] as const;

async function resolveTamanho(
  db: LabDbClient,
  queryTamanho: unknown,
): Promise<TamanhoEtiqueta> {
  const q = queryTamanho as TamanhoEtiqueta | undefined;
  if (q === "termica_100x50" || q === "termica_50x30" || q === "a4") return q;
  const cfg = await db.getLabConfig();
  const padrao = (cfg as LabConfigDb).tamanhoEtiquetaPadrao;
  if (padrao === "termica_50x30" || padrao === "a4") return padrao;
  return "termica_100x50";
}

protesesRouter.get("/", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const setor = req.query.setor as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 0, 500) || undefined;
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    let sql = "SELECT * FROM proteses WHERE clinica_id = ?";
    const params: unknown[] = [getClinicaId(req)];
    if (setor && SETORES_VALIDOS.includes(setor as (typeof SETORES_VALIDOS)[number])) {
      sql += " AND setor = ?";
      params.push(setor);
    }
    sql += " ORDER BY created_at DESC";
    if (limit) {
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    const rows = await db.queryAll(sql, params);
    const mapped = await Promise.all(rows.map((r) => mapProteseFromDb(db, r)));
    if (limit) {
      let countSql = "SELECT COUNT(*) as c FROM proteses WHERE clinica_id = ?";
      const countParams: unknown[] = [getClinicaId(req)];
      if (setor && SETORES_VALIDOS.includes(setor as (typeof SETORES_VALIDOS)[number])) {
        countSql += " AND setor = ?";
        countParams.push(setor);
      }
      const countRow = await db.queryOne<{ c: number }>(countSql, countParams);
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

protesesRouter.get("/codigo/:codigo", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne(
      "SELECT * FROM proteses WHERE clinica_id = ? AND (codigo = ? OR codigo_barras = ?)",
      [getClinicaId(req), req.params.codigo, req.params.codigo],
    );
    if (!row) return res.status(404).json({ erro: "Prótese não encontrada" });
    const protese = await mapProteseFromDb(db, row);
    res.json({ protese, historico: await getHistorico(db, getClinicaId(req), protese.id) });
  });
});

protesesRouter.get("/:id", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Prótese não encontrada" });
    const protese = await mapProteseFromDb(db, row);
    res.json({ protese, historico: await getHistorico(db, getClinicaId(req), protese.id) });
  });
});

protesesRouter.post("/", requirePolicy("proteses", "write"), async (req, res) => {
  try {
    await withLabClient(getClinicaId(req), async (db) => {
      const {
        pacienteId,
        dentistaNome,
        dentistaCro,
        dentistaClinica,
        dentistaTelefone,
        tipoProtese,
        dentes,
        cor,
        material,
        observacoes,
        dataEntrada,
        dataPrevistaEntrega,
        setor,
      } = req.body;

      const setorVal =
        setor && SETORES_VALIDOS.includes(setor) ? setor : "gesso";

      const paciente = await db.queryOne<Record<string, string>>(
        "SELECT * FROM clientes WHERE clinica_id = ? AND id = ?",
        [getClinicaId(req), pacienteId],
      );
      if (!paciente) return res.status(400).json({ erro: "Paciente não encontrado" });

      const seq = await db.getNextProteseSeq();
      const { codigo, codigoBarras } = gerarCodigoProtese(seq);
      const id = newId();
      const cid = getClinicaId(req);

      const proteseInput: ProteseRegistro = criarRegistroProtese({
        id,
        codigo,
        codigoBarras,
        pacienteId,
        paciente: {
          id: paciente.id,
          nome: paciente.nome,
          cpf: paciente.cpf,
          telefone: paciente.telefone,
          email: paciente.email,
        },
        dentista: {
          id: "ext",
          nome: dentistaNome,
          cro: dentistaCro,
          clinica: dentistaClinica,
          telefone: dentistaTelefone,
        },
        tipoProtese,
        dentes,
        cor,
        material,
        observacoes,
        dataEntrada: dataEntrada ?? new Date().toISOString().slice(0, 10),
        dataPrevistaEntrega,
        status: "recebido",
      });

      await db.run(
        `INSERT INTO proteses (id, clinica_id, codigo, codigo_barras, paciente_id, dentista_nome, dentista_cro, dentista_clinica, dentista_telefone, tipo_protese, dentes, cor, material, observacoes, data_entrada, data_prevista_entrega, status, setor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          proteseInput.id,
          cid,
          proteseInput.codigo,
          proteseInput.codigoBarras,
          pacienteId,
          dentistaNome,
          dentistaCro ?? null,
          dentistaClinica ?? null,
          dentistaTelefone ?? null,
          tipoProtese,
          dentes ?? null,
          cor ?? null,
          material ?? null,
          observacoes ?? null,
          proteseInput.dataEntrada,
          dataPrevistaEntrega ?? null,
          "recebido",
          setorVal,
        ],
      );

      await registrarHistorico(db, cid, proteseInput.id, "recebido", "Trabalho registrado");

      const tamanho = await resolveTamanho(db, req.query.tamanho);
      const lab = await db.getLabConfig();
      const etiqueta = await gerarEtiquetas3Vias(proteseInput, tamanho, lab);
      res.status(201).json({ protese: proteseInput, etiqueta });
    });
  } catch (err) {
    res.status(500).json({ erro: String(err) });
  }
});

protesesRouter.patch("/:id/status", requirePolicy("proteses", "write"), async (req, res) => {
  const { status, observacao } = req.body as { status: StatusProtese; observacao?: string };
  if (!STATUS_FLOW.includes(status))
    return res.status(400).json({ erro: "Status inválido", validos: STATUS_FLOW });

  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Prótese não encontrada" });

    await db.run("UPDATE proteses SET status = ? WHERE clinica_id = ? AND id = ?", [
      status,
      getClinicaId(req),
      req.params.id,
    ]);
    await registrarHistorico(db, getClinicaId(req), String(req.params.id), status, observacao);

    const updated = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    const protese = await mapProteseFromDb(db, updated!);
    res.json({ protese, historico: await getHistorico(db, getClinicaId(req), protese.id) });
  });
});

protesesRouter.get("/:id/etiqueta", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ erro: "Prótese não encontrada" });
    const protese = await mapProteseFromDb(db, row);
    const tamanho = await resolveTamanho(db, req.query.tamanho);
    const lab = await db.getLabConfig();
    const etiqueta = await gerarEtiquetas3Vias(protese, tamanho, lab);
    res.json(etiqueta);
  });
});

protesesRouter.patch("/:id/setor", requirePolicy("proteses", "write"), async (req, res) => {
  const { setor } = req.body as { setor?: string };
  if (!setor || !SETORES_VALIDOS.includes(setor as (typeof SETORES_VALIDOS)[number])) {
    return res.status(400).json({ erro: "Setor inválido", validos: SETORES_VALIDOS });
  }
  await withLabClient(getClinicaId(req), async (db) => {
    const r = await db.run("UPDATE proteses SET setor = ? WHERE clinica_id = ? AND id = ?", [
      setor,
      getClinicaId(req),
      req.params.id,
    ]);
    if (r.changes === 0) return res.status(404).json({ erro: "Prótese não encontrada" });
    const row = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    const protese = await mapProteseFromDb(db, row!);
    res.json({ protese });
  });
});

protesesRouter.get("/:id/imprimir", requirePolicy("proteses", "read"), async (req, res) => {
  await withLabClient(getClinicaId(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM proteses WHERE clinica_id = ? AND id = ?", [
      getClinicaId(req),
      req.params.id,
    ]);
    if (!row) return res.status(404).send("Prótese não encontrada");
    const protese = await mapProteseFromDb(db, row);
    const tamanho = await resolveTamanho(db, req.query.tamanho);
    const lab = await db.getLabConfig();
    const etiqueta = await gerarEtiquetas3Vias(protese, tamanho, lab);
    res.type("html").send(renderHtmlImpressao(etiqueta, lab));
  });
});

async function mapProteseFromDb(db: LabDbClient, row: Record<string, unknown>): Promise<ProteseRegistro & { setor: string }> {
  const paciente = await db.queryOne<Record<string, string>>(
    "SELECT * FROM clientes WHERE clinica_id = ? AND id = ?",
    [db.clinicaId, row.paciente_id as string],
  );

  return {
    id: row.id as string,
    codigo: row.codigo as string,
    codigoBarras: row.codigo_barras as string,
    pacienteId: row.paciente_id as string,
    paciente: {
      id: paciente!.id,
      nome: paciente!.nome,
      cpf: paciente!.cpf,
      telefone: paciente!.telefone,
      email: paciente!.email,
    },
    dentista: {
      id: "ext",
      nome: row.dentista_nome as string,
      cro: row.dentista_cro as string | undefined,
      clinica: row.dentista_clinica as string | undefined,
      telefone: row.dentista_telefone as string | undefined,
    },
    tipoProtese: row.tipo_protese as string,
    dentes: row.dentes as string | undefined,
    cor: row.cor as string | undefined,
    material: row.material as string | undefined,
    observacoes: row.observacoes as string | undefined,
    dataEntrada: row.data_entrada as string,
    dataPrevistaEntrega: row.data_prevista_entrega as string | undefined,
    status: row.status as StatusProtese,
    setor: (row.setor as string | undefined) ?? "gesso",
    createdAt: row.created_at as string,
  };
}

async function registrarHistorico(
  db: LabDbClient,
  clinicaId: number,
  proteseId: string,
  status: StatusProtese,
  observacao?: string,
) {
  await db.run(
    "INSERT INTO status_historico (id, clinica_id, protese_id, status, observacao) VALUES (?, ?, ?, ?, ?)",
    [newId(), clinicaId, proteseId, status, observacao ?? null],
  );
}

async function getHistorico(db: LabDbClient, clinicaId: number, proteseId: string) {
  const rows = await db.queryAll(
    "SELECT * FROM status_historico WHERE clinica_id = ? AND protese_id = ? ORDER BY created_at DESC",
    [clinicaId, proteseId],
  );
  return rows.map((h: Record<string, unknown>) => ({
    id: h.id,
    proteseId: h.protese_id,
    status: h.status,
    observacao: h.observacao,
    createdAt: h.created_at,
  }));
}
