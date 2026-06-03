import type { UsuarioPermissao } from "../api";

export function canAccess(
  permissoes: UsuarioPermissao[] | undefined | null,
  resource: string,
  action: "read" | "write" | "delete" = "read",
): boolean {
  if (!permissoes?.length) return false;
  for (const p of permissoes) {
    if (p.resource === "*" && p.actions.includes(action)) return true;
    if (p.resource === resource && p.actions.includes(action)) return true;
  }
  return false;
}

export function canSeeMenu(permissoes: UsuarioPermissao[] | undefined | null, resource: string): boolean {
  return canAccess(permissoes, resource, "read");
}

/** Map route path to RBAC resource */
export function routeResource(path: string): string {
  if (path === "/" || path.startsWith("/laboratorio") || path.startsWith("/setores") || path.startsWith("/relatorios"))
    return "proteses";
  if (path.startsWith("/clientes")) return "clientes";
  if (path.startsWith("/odontograma")) return "odontograma";
  if (path.startsWith("/fornecedores")) return "fornecedores";
  if (path.startsWith("/estoque")) return "estoque";
  if (path.startsWith("/proteses") || path.startsWith("/scanner") || path.startsWith("/etiquetas")) return "proteses";
  if (path.startsWith("/configuracao")) return "config";
  if (path.startsWith("/colaboradores")) return "colaboradores";
  if (path.startsWith("/empresa")) return "empresa";
  if (path.startsWith("/financeiro")) return "financeiro";
  if (path.startsWith("/procedimentos")) return "procedimentos";
  if (path.startsWith("/grupos")) return "grupos";
  return "proteses";
}
