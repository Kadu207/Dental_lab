import type { Request } from "express";

export function getClinicaId(req: Request): number {
  if (!req.auth) throw new Error("Auth context required");
  return req.auth.clinicaId;
}
