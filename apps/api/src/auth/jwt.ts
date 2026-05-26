import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_TTL_MINUTES } from "../config.js";
import type { AuthContext } from "./types.js";

export interface LabTokenPayload {
  sub: string;
  clinica_id: number;
  perfil: string;
  type: "access";
  user_id?: string | number;
  mode?: "standalone" | "embedded";
}

export function signLabToken(ctx: Omit<AuthContext, "mode"> & { mode: AuthContext["mode"] }): string {
  const payload: LabTokenPayload = {
    sub: ctx.sub,
    clinica_id: ctx.clinicaId,
    perfil: ctx.perfil,
    type: "access",
    user_id: ctx.userId,
    mode: ctx.mode,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${JWT_TTL_MINUTES}m` });
}

export function verifyLabToken(token: string): LabTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as LabTokenPayload;
  if (payload.type !== "access") throw new Error("Tipo de token inválido");
  return payload;
}

export function verifyErpToken(token: string, secret: string): LabTokenPayload {
  const payload = jwt.verify(token, secret) as LabTokenPayload & { type?: string };
  if (payload.type && payload.type !== "access") throw new Error("Tipo de token inválido");
  if (payload.clinica_id == null) throw new Error("Token sem clínica");
  return {
    sub: payload.sub,
    clinica_id: Number(payload.clinica_id),
    perfil: String(payload.perfil ?? "user"),
    type: "access",
  };
}
