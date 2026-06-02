import type { Request, Response, NextFunction } from "express";
import { DEPLOYMENT_MODE, LICENSE_KEY, LICENSE_REQUIRED } from "../config.js";
import { verifyLabToken } from "../auth/jwt.js";
import { verifyHmacToken, safeCompare } from "../licensing/core.js";
import { isLabModuleOperational, verifyLicenseHeader } from "../licensing/service.js";

function readLicenseHeader(req: Request): string {
  return (req.headers["x-dental-lab-license"] as string | undefined)?.trim() ?? "";
}

/** Comparação reservada para futuro HMAC (ERP assina payload com o mesmo segredo). */
export function verifyLicenseHeaderLegacy(req: Request): boolean {
  if (!LICENSE_KEY) return false;
  const header = readLicenseHeader(req);
  if (!header) return false;
  if (safeCompare(header, LICENSE_KEY)) return true;
  return verifyHmacToken(header, LICENSE_KEY);
}

const EXEMPT_PREFIXES = [
  "/api/health",
  "/api/license",
  "/api/licencas",
  "/api/auth",
  "/api/supervisor",
];

function requestPath(req: Request): string {
  const p = req.originalUrl.split("?")[0] ?? req.path;
  return p.startsWith("/") ? p : `/${p}`;
}

function isSupervisorToken(req: Request): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    return verifyLabToken(auth.slice(7).trim()).perfil === "supervisor";
  } catch {
    return false;
  }
}

export async function licenseGate(req: Request, res: Response, next: NextFunction) {
  if (!LICENSE_REQUIRED) return next();

  const path = requestPath(req);
  if (EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return next();
  }

  if (isSupervisorToken(req)) return next();

  const header = readLicenseHeader(req);
  const clinicaId = Number(req.headers["x-clinica-id"] ?? req.auth?.clinicaId ?? 1);

  if (header) {
    const okDb = await verifyLicenseHeader(header, clinicaId, LICENSE_KEY);
    if (okDb) return next();
    if (verifyLicenseHeaderLegacy(req)) return next();
    return res.status(403).json({
      erro: "Módulo laboratório: licença inválida. Envie X-Dental-Lab-License.",
      code: "LAB_LICENSE_INVALID",
    });
  }

  if (DEPLOYMENT_MODE === "embedded") {
    // BFF do ERP já valida sessão e habilitação do módulo; JWT vai em Authorization.
    return next();
  }

  if (await isLabModuleOperational(clinicaId)) return next();

  return res.status(503).json({
    erro: "Módulo laboratório: licença ou período de teste não disponível. Ative em Empresa → Licença.",
    code: "LAB_LICENSE_REQUIRED",
  });
}
