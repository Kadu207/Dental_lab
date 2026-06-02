import type { Request } from "express";
import { isSupervisor } from "../auth/rbac.js";

export function getClinicaId(req: Request): number {
  if (!req.auth) throw new Error("Auth context required");

  if (isSupervisor(req.auth.perfil)) {
    const header = req.headers["x-clinica-id"];
    if (header != null && String(header).trim() !== "") {
      const cid = Number(header);
      if (!Number.isFinite(cid) || cid <= 0) {
        throw new Error("X-Clinica-Id inválido");
      }
      return cid;
    }
    if (req.auth.clinicaId > 0) return req.auth.clinicaId;
    throw new Error("Supervisor deve informar X-Clinica-Id para operar em um tenant");
  }

  return req.auth.clinicaId;
}

/** clinicaId para rotas que aceitam supervisor sem tenant (ex.: registry). */
export function getOptionalClinicaId(req: Request): number | null {
  if (!req.auth) return null;
  if (isSupervisor(req.auth.perfil)) {
    const header = req.headers["x-clinica-id"];
    if (header != null && String(header).trim() !== "") return Number(header);
    return req.auth.clinicaId > 0 ? req.auth.clinicaId : null;
  }
  return req.auth.clinicaId;
}
