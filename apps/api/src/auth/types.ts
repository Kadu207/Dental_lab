import type { UsuarioPermissao } from "./rbac.js";

export interface AuthContext {
  mode: "standalone" | "embedded";
  clinicaId: number;
  userId: string | number;
  sub: string;
  perfil: string;
  permissoes?: UsuarioPermissao[];
  /** Conta supervisor (platform_usuarios), fora do schema tenant */
  isPlatformUser?: boolean;
}
