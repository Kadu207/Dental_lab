import type { Request, Response, NextFunction } from "express";
import { DEPLOYMENT_MODE, LICENSE_KEY, LICENSE_REQUIRED } from "../config.js";
import { verifyLabToken } from "../auth/jwt.js";
import { safeCompare, verifyHmacToken } from "../licensing/core.js";
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

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestPath(req: Request): string {
  const p = req.originalUrl.split("?")[0] ?? req.path;
  return p.startsWith("/") ? p : `/${p}`;
}

function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

/** Rotas de escrita permitidas mesmo com licença/trial expirados. */
function isWriteExempt(path: string, method: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  if (path === "/api/licencas/ativar" || path.startsWith("/api/licencas/ativar/")) return true;
  return false;
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

async function passesLicenseCheck(req: Request, clinicaId: number): Promise<boolean> {
  const header = readLicenseHeader(req);
  if (header) {
    if (await verifyLicenseHeader(header, clinicaId, LICENSE_KEY)) return true;
    if (verifyLicenseHeaderLegacy(req)) return true;
    return false;
  }

  if (DEPLOYMENT_MODE === "embedded" && !header) return true;

  return isLabModuleOperational(clinicaId);
}

export async function licenseGate(req: Request, res: Response, next: NextFunction) {
  if (!LICENSE_REQUIRED) return next();

  const path = requestPath(req);
  const method = req.method.toUpperCase();

  if (EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return next();
  }

  if (isSupervisorToken(req)) return next();

  const clinicaId = Number(req.headers["x-clinica-id"] ?? req.auth?.clinicaId ?? 1);
  const write = isWriteMethod(method);

  if (write && isWriteExempt(path, method)) {
    return next();
  }

  const ok = await passesLicenseCheck(req, clinicaId);

  if (ok) return next();

  if (!write) {
    return next();
  }

  const header = readLicenseHeader(req);
  if (header) {
    return res.status(403).json({
      erro: "Módulo laboratório: licença inválida. Envie X-Dental-Lab-License válida.",
      code: "LAB_LICENSE_INVALID",
    });
  }

  return res.status(403).json({
    erro: "Licença ou período de teste expirado. O sistema está em modo somente leitura. Ative em Empresa → Licença.",
    code: "LAB_LICENSE_WRITE_BLOCKED",
    readOnly: true,
  });
}
