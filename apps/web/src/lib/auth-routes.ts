/** Rota inicial após login conforme perfil RBAC */
export function getPostLoginPath(perfil: string, isPlatformUser?: boolean): string {
  if (perfil === "supervisor" || (isPlatformUser && perfil === "admin")) {
    return "/supervisor/cadastro";
  }
  return "/";
}
