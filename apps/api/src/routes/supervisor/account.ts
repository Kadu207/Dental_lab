import { Router } from "express";
import { changePlatformUserPassword } from "../../auth/platform.js";
import { requireSupervisor } from "../../auth/rbac.js";

export const supervisorAccountRouter = Router();

supervisorAccountRouter.use(requireSupervisor());

supervisorAccountRouter.put("/senha", async (req, res) => {
  const { senhaAtual, novaSenha } = req.body as { senhaAtual?: string; novaSenha?: string };
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: "Senha atual e nova senha são obrigatórias" });
  }

  try {
    await changePlatformUserPassword(String(req.auth!.userId), senhaAtual, novaSenha);
    res.json({ ok: true, mensagem: "Senha alterada com sucesso" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível alterar a senha";
    const status = msg === "Senha atual incorreta" ? 403 : 400;
    return res.status(status).json({ erro: msg });
  }
});
