import type { UsuarioPermissao } from "./rbac.js";

export interface AuthContext {
  mode: "standalone" | "embedded";
  clinicaId: number;
  userId: string | number;
  sub: string;
  perfil: string;
  permissoes?: UsuarioPermissao[];
}
