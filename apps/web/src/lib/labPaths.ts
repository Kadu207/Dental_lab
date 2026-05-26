/** Rotas internas do SPA (sem basename /lab). */
export const LAB_ROUTE_SEGMENTS = new Set([
  "",
  "laboratorio",
  "empresa",
  "financeiro",
  "colaboradores",
  "procedimentos",
  "grupos",
  "estoque",
  "clientes",
  "fornecedores",
  "proteses",
  "configuracao",
  "scanner",
]);

export function routerBasename(): string {
  const raw = (import.meta.env.BASE_URL || "/").trim();
  if (!raw || raw === "/") return "/";
  return raw.replace(/\/+$/, "") || "/";
}

/** Normaliza labPath vindo do ERP (?labPath=/financeiro). Retorna "" para home do lab. */
export function normalizeLabPath(path?: string | null): string {
  if (!path?.trim()) return "";
  let p = path.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+$/, "") || "";
  if (p === "/" || p === "") return "";
  const segment = p.replace(/^\//, "").split("/")[0]?.toLowerCase() ?? "";
  if (!LAB_ROUTE_SEGMENTS.has(segment)) return "";
  return p;
}
