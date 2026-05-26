import { Router, type Request } from "express";
import { DEFAULT_POLICIES, PERFIS_VALIDOS, parsePermissoes, requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { newId } from "../db/index.js";

export const gruposRouter = Router();

function cid(req: Request) {
  return req.auth!.clinicaId;
}

gruposRouter.get("/me", async (req, res) => {
  if (!req.auth) return res.status(401).json({ erro: "Não autenticado" });
  const grupo = await withLabClient(req.auth.clinicaId, async (db) =>
    db.queryOne<{ role: string }>(
      "SELECT role FROM grupos_permissoes WHERE clinica_id = ? AND user_id = ?",
      [req.auth!.clinicaId, String(req.auth!.userId)],
    ),
  );
  const role = grupo?.role ?? req.auth.perfil;
  res.json({
    userId: req.auth.userId,
    perfil: req.auth.perfil,
    roleEfetivo: role,
    permissoes: req.auth.permissoes ?? parsePermissoes(null, role),
    politicasPadrao: DEFAULT_POLICIES,
  });
});

gruposRouter.get("/permissoes", requirePolicy("grupos", "read"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const rows = await db.queryAll(
      `SELECT g.*, u.nome as usuario_nome FROM grupos_permissoes g
       LEFT JOIN lab_usuarios u ON u.id = g.user_id AND u.clinica_id = g.clinica_id
       WHERE g.clinica_id = ? ORDER BY u.nome`,
      [cid(req)],
    );
    res.json(
      rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        userId: r.user_id,
        usuarioNome: r.usuario_nome,
        role: r.role,
        createdAt: r.created_at,
      })),
    );
  });
});

gruposRouter.post("/permissoes", requirePolicy("grupos", "write"), async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ erro: "userId e role são obrigatórios" });
  if (!PERFIS_VALIDOS.includes(role)) {
    return res.status(400).json({ erro: "Perfil inválido", validos: PERFIS_VALIDOS });
  }
  await withLabClient(cid(req), async (db) => {
    await db.run("DELETE FROM grupos_permissoes WHERE clinica_id = ? AND user_id = ?", [cid(req), userId]);
    const id = newId();
    await db.run("INSERT INTO grupos_permissoes (id, clinica_id, user_id, role) VALUES (?, ?, ?, ?)", [
      id,
      cid(req),
      userId,
      role,
    ]);
    res.status(201).json({ msg: "Grupo atribuído", userId, role });
  });
});

gruposRouter.delete("/permissoes/:id", requirePolicy("grupos", "write"), async (req, res) => {
  await withLabClient(cid(req), async (db) => {
    const r = await db.run("DELETE FROM grupos_permissoes WHERE clinica_id = ? AND id = ?", [
      cid(req),
      req.params.id,
    ]);
    if (r.changes === 0) return res.status(404).json({ erro: "Atribuição não encontrada" });
    res.status(204).send();
  });
});
