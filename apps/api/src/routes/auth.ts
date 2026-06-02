import { Router } from "express";
import { AUTH_REQUIRED, DEPLOYMENT_MODE, JWT_TTL_MINUTES } from "../config.js";
import { requestPasswordReset, resetPasswordWithToken, verifyPasswordResetToken } from "../auth/password-reset.js";
import { loginStandalone } from "../auth/standalone.js";
import { loginPlatformUser } from "../auth/platform.js";
import { withLabClient } from "../db/client.js";
import { ensureDefaultEmpresaAndTrial } from "../licensing/service.js";

export const authRouter = Router();

authRouter.get("/status", (_req, res) => {
  res.json({
    authRequired: AUTH_REQUIRED,
    deploymentMode: DEPLOYMENT_MODE,
    loginDisponivel: DEPLOYMENT_MODE === "standalone",
  });
});

authRouter.post("/login", async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({
      erro: "No modo integrado, use o login do Excellence Dental e envie o mesmo token Bearer nas requisições.",
      code: "LOGIN_USE_ERP",
    });
  }

  const { usuario, senha, clinicaId } = req.body as {
    usuario?: string;
    senha?: string;
    clinicaId?: number;
  };
  if (!usuario?.trim() || !senha) {
    return res.status(400).json({ erro: "Usuário e senha são obrigatórios" });
  }

  try {
    const platformLogin = await loginPlatformUser(usuario, senha);
    if (platformLogin) {
      return res.json({
        token: platformLogin.token,
        expiresInMinutes: JWT_TTL_MINUTES,
        nome: platformLogin.auth.sub,
        perfil: platformLogin.auth.perfil,
        clinicaId: platformLogin.auth.clinicaId,
        modo: platformLogin.auth.mode,
        isPlatformUser: true,
      });
    }

    const cid = Number(clinicaId ?? 1);
    const result = await withLabClient(cid, async (db) => {
      const login = await loginStandalone(db, usuario, senha, cid);
      await ensureDefaultEmpresaAndTrial(db, cid);
      return login;
    });
    res.json({
      token: result.token,
      expiresInMinutes: JWT_TTL_MINUTES,
      nome: result.auth.sub,
      perfil: result.auth.perfil,
      clinicaId: result.auth.clinicaId,
      modo: result.auth.mode,
    });
  } catch {
    return res.status(401).json({ erro: "Credenciais inválidas", code: "INVALID_CREDENTIALS" });
  }
});

authRouter.get("/me", async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ erro: "Não autenticado" });
  }
  res.json({
    sub: req.auth.sub,
    perfil: req.auth.perfil,
    clinicaId: req.auth.clinicaId,
    modo: req.auth.mode,
    userId: req.auth.userId,
    permissoes: req.auth.permissoes,
    isPlatformUser: req.auth.isPlatformUser ?? false,
  });
});

authRouter.post("/recuperar-senha/solicitar", async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({
      erro: "Recuperação de senha disponível apenas no modo standalone.",
      code: "RESET_STANDALONE_ONLY",
    });
  }

  const { usuario, email, clinicaId } = req.body as {
    usuario?: string;
    email?: string;
    clinicaId?: number;
  };

  if (!usuario?.trim() || !email?.trim()) {
    return res.status(400).json({ erro: "Usuário e e-mail são obrigatórios" });
  }

  try {
    const cid = Number(clinicaId ?? 1);
    const resetToken = await withLabClient(cid, async (db) =>
      requestPasswordReset(db, usuario, email, cid),
    );

    res.json({
      ok: true,
      resetToken: resetToken ?? undefined,
      mensagem:
        "Se os dados estiverem corretos, prossiga para definir uma nova senha. Caso contrário, verifique com o administrador.",
    });
  } catch {
    return res.status(500).json({ erro: "Não foi possível processar a solicitação" });
  }
});

authRouter.post("/recuperar-senha/redefinir", async (req, res) => {
  if (DEPLOYMENT_MODE === "embedded") {
    return res.status(400).json({
      erro: "Recuperação de senha disponível apenas no modo standalone.",
      code: "RESET_STANDALONE_ONLY",
    });
  }

  const { token, novaSenha } = req.body as { token?: string; novaSenha?: string };
  if (!token?.trim() || !novaSenha) {
    return res.status(400).json({ erro: "Token e nova senha são obrigatórios" });
  }

  try {
    const { clinicaId } = verifyPasswordResetToken(token.trim());
    await withLabClient(clinicaId, async (db) => resetPasswordWithToken(db, token, novaSenha));
    res.json({ ok: true, mensagem: "Senha redefinida com sucesso" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível redefinir a senha";
    return res.status(400).json({ erro: msg });
  }
});
