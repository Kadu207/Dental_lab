import pg from "pg";
import { DEPLOYMENT_MODE, ERP_JWT_SECRET } from "../config.js";
import { getErpPool } from "../db/init.js";
import { verifyErpToken } from "./jwt.js";
import type { AuthContext } from "./types.js";

let erpPoolSingleton: pg.Pool | null = null;

function erpPool(): pg.Pool {
  if (!erpPoolSingleton) {
    erpPoolSingleton = getErpPool();
  }
  if (!erpPoolSingleton) {
    throw new Error("DENTAL_LAB_ERP_DATABASE_URL não configurada para modo embedded");
  }
  return erpPoolSingleton;
}

export async function resolveEmbeddedAuth(
  bearerToken: string,
  clinicaHeader?: string | number,
): Promise<AuthContext> {
  if (DEPLOYMENT_MODE !== "embedded") {
    throw new Error("Modo embedded não ativo");
  }

  const payload = verifyErpToken(bearerToken, ERP_JWT_SECRET);
  const tokenCid = Number(payload.clinica_id);
  if (clinicaHeader !== undefined && clinicaHeader !== null && clinicaHeader !== "") {
    const headerCid = Number(clinicaHeader);
    if (headerCid !== tokenCid) {
      throw new Error("Clínica do cabeçalho não corresponde ao token");
    }
  }

  const pool = erpPool();
  const sub = (payload.sub ?? "").trim();
  const r = await pool.query<{ id: number; nome: string; tipo: string; clinica_id: number }>(
    `SELECT id, nome, tipo, clinica_id FROM usuario WHERE lower(nome) = lower($1) AND clinica_id = $2 LIMIT 1`,
    [sub, tokenCid],
  );
  const user = r.rows[0];
  if (!user) throw new Error("Usuário não encontrado no ERP");

  return {
    mode: "embedded",
    clinicaId: user.clinica_id,
    userId: user.id,
    sub: user.nome,
    perfil: user.tipo,
  };
}
