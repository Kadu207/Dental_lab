import { getErpPool } from "../db/init.js";
import { mapErpPerfil } from "./enrich.js";

export type ErpUsuarioRow = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  perfilLab: string;
  descricao: string | null;
  clinicaId: number;
  origem: "erp";
};

/** Lista colaboradores da tabela `usuario` do Excellence (modo embedded). */
export async function listErpUsuarios(clinicaId: number): Promise<ErpUsuarioRow[]> {
  const pool = getErpPool();
  if (!pool) {
    throw new Error("ERP database não configurado (DENTAL_LAB_ERP_DATABASE_URL)");
  }
  const r = await pool.query<{
    id: number;
    nome: string;
    email: string | null;
    tipo: string;
    descricao: string | null;
    clinica_id: number;
  }>(
    `SELECT id, nome, email, tipo, descricao, clinica_id FROM usuario WHERE clinica_id = $1 ORDER BY nome`,
    [clinicaId],
  );
  return r.rows.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email ?? "",
    perfil: u.tipo,
    perfilLab: mapErpPerfil(u.tipo),
    descricao: u.descricao,
    clinicaId: u.clinica_id,
    origem: "erp" as const,
  }));
}
