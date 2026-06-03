import { parsePermissoes, PERFIS_VALIDOS, isSupervisor, type LabPerfil } from "./rbac.js";

const PERFIS_LAB = PERFIS_VALIDOS;
import type { AuthContext } from "./types.js";
import { withLabClient } from "../db/client.js";

export async function enrichAuthPermissions(auth: AuthContext): Promise<AuthContext> {
  if (auth.isPlatformUser || isSupervisor(auth.perfil)) {
    const permissoes = parsePermissoes(null, "supervisor");
    return { ...auth, permissoes };
  }

  if (auth.mode === "embedded") {
    let perfil = mapErpPerfil(auth.perfil);
    const grupo = await withLabClient(auth.clinicaId, (db) =>
      db.queryOne<{ role: string }>(
        "SELECT role FROM grupos_permissoes WHERE clinica_id = ? AND user_id = ?",
        [auth.clinicaId, String(auth.userId)],
      ),
    );
    if (grupo?.role && PERFIS_LAB.includes(grupo.role as LabPerfil)) {
      perfil = grupo.role as LabPerfil;
    }
    return { ...auth, perfil, permissoes: parsePermissoes(null, perfil) };
  }

  const row = await withLabClient(auth.clinicaId, async (db) =>
    db.queryOne<{ perfil: string; permissoes: string | null }>(
      "SELECT perfil, permissoes FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
      [auth.clinicaId, String(auth.userId)],
    ),
  );

  const perfil = (row?.perfil ?? auth.perfil) as LabPerfil;
  const permissoes = parsePermissoes(row?.permissoes, perfil);
  return { ...auth, perfil, permissoes };
}

export function mapErpPerfil(tipo: string): LabPerfil {
  const t = tipo.toLowerCase();
  const map: Record<string, LabPerfil> = {
    admin: "admin",
    recepcionista: "recepcao",
    recepcao: "recepcao",
    dentista: "colaborador",
    user: "colaborador",
    colaborador: "colaborador",
    estagiario: "estagiario",
    suporte: "gestor",
    gestor: "gestor",
    laboratorio: "laboratorio",
  };
  return map[t] ?? "estagiario";
}
