import type { Request, Response, NextFunction } from "express";
import { AUTH_REQUIRED, DEPLOYMENT_MODE } from "../config.js";
import { enrichAuthPermissions } from "../auth/enrich.js";
import { resolveEmbeddedAuth } from "../auth/embedded.js";
import { verifyLabToken } from "../auth/jwt.js";
import { loginStandalone } from "../auth/standalone.js";
import type { AuthContext } from "../auth/types.js";

const EXEMPT_PREFIXES = [
  "/api/health",
  "/api/license",
  "/api/auth/login",
  "/api/auth/status",
  "/api/auth/recuperar-senha",
  "/api/licencas/status",
];

function requestPath(req: Request): string {
  const p = req.originalUrl.split("?")[0] ?? req.path;
  return p.startsWith("/") ? p : `/${p}`;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export async function authGate(req: Request, res: Response, next: NextFunction) {
  if (!AUTH_REQUIRED) return next();

  const path = requestPath(req);
  if (EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return next();
  }

  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({
      erro: "Autenticação obrigatória. Faça login ou use o token do ERP.",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    let auth: AuthContext;

    if (DEPLOYMENT_MODE === "embedded") {
      const clinicaHeader = req.headers["x-clinica-id"] as string | undefined;
      auth = await resolveEmbeddedAuth(token, clinicaHeader);
    } else {
      const payload = verifyLabToken(token);
      auth = {
        mode: "standalone",
        clinicaId: Number(payload.clinica_id),
        userId: payload.user_id ?? payload.sub,
        sub: payload.sub,
        perfil: payload.perfil,
        isPlatformUser: payload.perfil === "supervisor" && Number(payload.clinica_id) === 0,
      };
    }

    req.auth = await enrichAuthPermissions(auth);
    next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token inválido";
    return res.status(401).json({ erro: msg, code: "AUTH_INVALID" });
  }
}

export { loginStandalone };
