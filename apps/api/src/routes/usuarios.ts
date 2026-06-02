import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { DEPLOYMENT_MODE } from "../config.js";
import { listErpUsuarios } from "../auth/erp-users.js";
import { TENANT_PERFIS, canManagePerfil, requirePolicy, type LabPerfil, type UsuarioPermissao } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";

export const usuariosRouter = Router();

function cid(req: Request) {
  return req.auth!.clinicaId;
}

function actorPerfil(req: Request): LabPerfil {
  return req.auth!.perfil as LabPerfil;
}

function forbiddenRank(res: Response) {
  return res.status(403).json({
    erro: "Sem permissão para gerenciar usuário com este perfil",
    code: "FORBIDDEN_RANK",
  });
}

usuariosRouter.get("/", requirePolicy("colaboradores", "read"), async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    try {
      const rows = await listErpUsuarios(cid(req));
      return res.json(
        rows.map((u) => ({
          id: String(u.id),
          nome: u.nome,
          email: u.email,
          perfil: u.perfil,
          perfilLab: u.perfilLab,
          ativo: true,
          descricao: u.descricao,
          permissoes: null,
          origem: "erp",
        })),
      );
    } catch (e) {
      return res.status(502).json({
        erro: e instanceof Error ? e.message : "Falha ao listar usuários do ERP",
      });
    }
  }
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll(
      "SELECT id, nome, email, perfil, ativo, permissoes, descricao, created_at FROM lab_usuarios WHERE clinica_id = ? ORDER BY nome",
      [cid(req)],
    );
    res.json(rows.map(mapUser));
  });
});

usuariosRouter.post("/", requirePolicy("colaboradores", "write"), async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({ erro: "Use o ERP para cadastrar usuários.", code: "USE_ERP_USERS" });
  }
  const { nome, senha, email, perfil, descricao } = req.body;
  if (!nome?.trim() || !senha) return res.status(400).json({ erro: "Nome e senha são obrigatórios" });
  if (!TENANT_PERFIS.includes(perfil)) {
    return res.status(400).json({ erro: "Perfil inválido", validos: TENANT_PERFIS });
  }
  if (!canManagePerfil(actorPerfil(req), perfil as LabPerfil)) {
    return forbiddenRank(res);
  }
  const id = newId();
  const hash = await bcrypt.hash(senha, 10);
  try {
    await withLabClient(cid(req), async (db) => {
      await db.run(
        `INSERT INTO lab_usuarios (id, clinica_id, nome, email, senha_hash, perfil, descricao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, cid(req), nome.trim(), email ?? null, hash, perfil, descricao ?? null],
      );
      const row = await db.queryOne(
        "SELECT id, nome, email, perfil, ativo, permissoes, descricao, created_at FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
        [cid(req), id],
      );
      res.status(201).json(mapUser(row!));
    });
  } catch {
    res.status(409).json({ erro: "Usuário já existe nesta clínica" });
  }
});

usuariosRouter.put("/:id", requirePolicy("colaboradores", "write"), async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({ erro: "Use o ERP para editar usuários.", code: "USE_ERP_USERS" });
  }
  const { nome, email, perfil, senha, descricao, ativo } = req.body;
  await withLabClient(cid(req), async (db) => {
    const atual = await db.queryOne<{ id: string; perfil: string }>(
      "SELECT id, perfil FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
      [cid(req), req.params.id],
    );
    if (!atual) return res.status(404).json({ erro: "Usuário não encontrado" });

    const targetPerfil = (perfil ?? atual.perfil) as LabPerfil;
    const isSelf = String(req.auth!.userId) === req.params.id;

    if (perfil && !TENANT_PERFIS.includes(perfil)) {
      return res.status(400).json({ erro: "Perfil inválido", validos: TENANT_PERFIS });
    }

    if (!isSelf || perfil !== atual.perfil) {
      if (!canManagePerfil(actorPerfil(req), atual.perfil as LabPerfil)) {
        return forbiddenRank(res);
      }
      if (perfil && !canManagePerfil(actorPerfil(req), targetPerfil)) {
        return forbiddenRank(res);
      }
    }

    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await db.run(
        `UPDATE lab_usuarios SET nome=?, email=?, perfil=?, descricao=?, ativo=?, senha_hash=? WHERE clinica_id=? AND id=?`,
        [nome, email ?? null, perfil, descricao ?? null, ativo === false ? 0 : 1, hash, cid(req), req.params.id],
      );
    } else {
      await db.run(
        `UPDATE lab_usuarios SET nome=?, email=?, perfil=?, descricao=?, ativo=? WHERE clinica_id=? AND id=?`,
        [nome, email ?? null, perfil, descricao ?? null, ativo === false ? 0 : 1, cid(req), req.params.id],
      );
    }
    const row = await db.queryOne(
      "SELECT id, nome, email, perfil, ativo, permissoes, descricao, created_at FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
      [cid(req), req.params.id],
    );
    res.json(mapUser(row!));
  });
});

usuariosRouter.put("/:id/permissoes", requirePolicy("colaboradores", "write"), async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({ erro: "Permissões no modo integrado vêm do ERP.", code: "USE_ERP_USERS" });
  }
  const { permissoes } = req.body as { permissoes?: UsuarioPermissao[] };
  if (!Array.isArray(permissoes)) return res.status(400).json({ erro: "permissoes deve ser um array" });
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("UPDATE lab_usuarios SET permissoes = ? WHERE clinica_id = ? AND id = ?", [
      JSON.stringify(permissoes),
      cid(req),
      req.params.id,
    ]);
    if (r.changes === 0) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json({ msg: "Permissões atualizadas" });
  });
});

usuariosRouter.delete("/:id", requirePolicy("colaboradores", "delete"), async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({ erro: "Use o ERP para remover usuários.", code: "USE_ERP_USERS" });
  }
  if (String(req.auth!.userId) === req.params.id) {
    return res.status(400).json({ erro: "Não é possível excluir o próprio usuário" });
  }
  await withLabClient(cid(req), async (db) => {
    const alvo = await db.queryOne<{ perfil: string }>(
      "SELECT perfil FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
      [cid(req), req.params.id],
    );
    if (!alvo) return res.status(404).json({ erro: "Usuário não encontrado" });
    if (!canManagePerfil(actorPerfil(req), alvo.perfil as LabPerfil)) {
      return forbiddenRank(res);
    }
    const r = await db.run("DELETE FROM lab_usuarios WHERE clinica_id = ? AND id = ?", [cid(req), req.params.id]);
    if (r.changes === 0) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.status(204).send();
  });
});

function mapUser(row: Record<string, unknown>) {
  let permissoes: UsuarioPermissao[] | null = null;
  if (row.permissoes && typeof row.permissoes === "string") {
    try {
      permissoes = JSON.parse(row.permissoes);
    } catch {
      permissoes = null;
    }
  }
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    ativo: row.ativo === 1 || row.ativo === true,
    descricao: row.descricao,
    permissoes,
    createdAt: row.created_at,
  };
}
