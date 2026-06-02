import { Router, type Request } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { ensureMatrizTrial, ensureUnidadeTrial } from "../licensing/service.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";

export const empresaRouter = Router();

function cid(req: Request) {
  return req.auth!.clinicaId;
}

empresaRouter.get("/", requirePolicy("empresa", "read"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const row = await db.queryOne("SELECT * FROM empresa WHERE clinica_id = ?", [cid(req)]);
    res.json(mapEmpresa(row ?? { clinica_id: cid(req) }));
  });
});

empresaRouter.post("/", requirePolicy("empresa", "write"), async (req, res) => {
  const b = req.body;
  await withLabClient(cid(req), async (db) => {
    const exists = await db.queryOne("SELECT clinica_id FROM empresa WHERE clinica_id = ?", [cid(req)]);
    const fields = [
      b.razaoSocial ?? b.razao_social,
      b.nomeFantasia ?? b.nome_fantasia,
      b.cnpj,
      b.cpf,
      b.telefone,
      b.celular,
      b.email,
      b.redeSocial ?? b.rede_social,
      b.cep,
      b.endereco,
      b.numero,
      b.bairro,
      b.cidade,
      b.estado,
      b.nomeResponsavel ?? b.nome_responsavel,
      b.contatoResponsavel ?? b.contato_responsavel,
    ];
    const now = new Date().toISOString();
    if (exists) {
      await db.run(
        `UPDATE empresa SET razao_social=?, nome_fantasia=?, cnpj=?, cpf=?, telefone=?, celular=?, email=?,
         rede_social=?, cep=?, endereco=?, numero=?, bairro=?, cidade=?, estado=?, nome_responsavel=?, contato_responsavel=?,
         updated_at=? WHERE clinica_id=?`,
        [...fields, now, cid(req)],
      );
    } else {
      await db.run(
        `INSERT INTO empresa (clinica_id, razao_social, nome_fantasia, cnpj, cpf, telefone, celular, email,
         rede_social, cep, endereco, numero, bairro, cidade, estado, nome_responsavel, contato_responsavel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cid(req), ...fields],
      );
    }
    await ensureMatrizTrial(db, cid(req));
    const row = await db.queryOne("SELECT * FROM empresa WHERE clinica_id = ?", [cid(req)]);
    res.json({ msg: "Empresa salva", empresa: mapEmpresa(row!) });
  });
});

empresaRouter.get("/unidades", requirePolicy("empresa", "read"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll("SELECT * FROM empresa_unidades WHERE clinica_id = ? ORDER BY nome", [cid(req)]);
    res.json(rows.map(mapUnidade));
  });
});

empresaRouter.post("/unidades", requirePolicy("empresa", "write"), async (req, res) => {
  const { nome, cep, endereco, numero, bairro, cidade, estado } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: "Nome da unidade é obrigatório" });
  const id = newId();
  await withLabClient(cid(req), async (db) => {
    await db.run(
      `INSERT INTO empresa_unidades (id, clinica_id, nome, cep, endereco, numero, bairro, cidade, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, cid(req), nome.trim(), cep ?? null, endereco ?? null, numero ?? null, bairro ?? null, cidade ?? null, estado ?? null],
    );
    const row = await db.queryOne("SELECT * FROM empresa_unidades WHERE clinica_id = ? AND id = ?", [cid(req), id]);
    await ensureUnidadeTrial(db, cid(req), id);
    res.status(201).json(mapUnidade(row!));
  });
});

empresaRouter.delete("/unidades/:id", requirePolicy("empresa", "write"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("DELETE FROM empresa_unidades WHERE clinica_id = ? AND id = ?", [cid(req), req.params.id]);
    if (r.changes === 0) return res.status(404).json({ erro: "Unidade não encontrada" });
    res.status(204).send();
  });
});

function mapEmpresa(row: Record<string, unknown>) {
  return {
    clinicaId: row.clinica_id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    cpf: row.cpf,
    telefone: row.telefone,
    celular: row.celular,
    email: row.email,
    redeSocial: row.rede_social,
    cep: row.cep,
    endereco: row.endereco,
    numero: row.numero,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    nomeResponsavel: row.nome_responsavel,
    contatoResponsavel: row.contato_responsavel,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    updatedAt: row.updated_at,
  };
}

function mapUnidade(row: Record<string, unknown>) {
  return {
    id: row.id,
    nome: row.nome,
    cep: row.cep,
    endereco: row.endereco,
    numero: row.numero,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    ativo: row.ativo === 1 || row.ativo === true,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
  };
}
