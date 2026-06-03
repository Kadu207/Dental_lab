/** Rota inicial após login conforme perfil RBAC */
export function getPostLoginPath(perfil: string): string {
  if (perfil === "supervisor") return "/supervisor/cadastro";
  return "/";
}
