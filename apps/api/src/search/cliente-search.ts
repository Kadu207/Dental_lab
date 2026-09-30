import type { DbDriverKind } from "../db/client.js";

/**
 * Acentos cobertos no laboratório (pt-BR).
 * `FROM` e `TO` têm o mesmo tamanho: translate/replace dependem disso.
 */
export const ACCENT_FROM =
  "áàâãäåéèêëíìîïóòôõöúùûüýÿçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÝŸÇÑ";
export const ACCENT_TO =
  "aaaaaaeeeeiiiiooooouuuuyycnaaaaaaeeeeiiiiooooouuuuyycn";

if (ACCENT_FROM.length !== ACCENT_TO.length) {
  throw new Error("Mapa de acentos inválido");
}

const FOLD_MAP = new Map<string, string>();
for (let i = 0; i < ACCENT_FROM.length; i++) {
  FOLD_MAP.set(ACCENT_FROM[i]!, ACCENT_TO[i]!);
}

const MAX_SEARCH_CHARS = 80;
const MAX_TOKENS = 8;
const MAX_TOKEN_CHARS = 48;

export type SearchFilter = {
  sql: string;
  params: unknown[];
};

export function normalizeUserSearch(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_SEARCH_CHARS);
}

/** Minúsculas e sem acento. Não interpreta `%` nem `_` como curinga. */
export function foldSearchText(value: string): string {
  const lower = value.toLowerCase();
  let out = "";
  for (const ch of lower) {
    out += FOLD_MAP.get(ch) ?? ch;
  }
  return out;
}

export function tokenizeSearch(folded: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const part of folded.split(/[^a-z0-9]+/)) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    tokens.push(part.slice(0, MAX_TOKEN_CHARS));
    if (tokens.length === MAX_TOKENS) break;
  }
  return tokens;
}

export function toPrefixTsQuery(tokens: string[]): string {
  return tokens.map((token) => `${token}:*`).join(" & ");
}

export function toSqliteMatchQuery(tokens: string[]): string {
  return tokens.map((token) => `"${token}"*`).join(" ");
}

/**
 * Filtro de pacientes sem `LIKE '%termo%'`.
 * O texto do usuário vai só em parâmetro (`strpos`/`instr` ou `to_tsquery` já sanitizado).
 */
export function buildClienteSearch(driver: DbDriverKind, raw: string): SearchFilter | null {
  const normalized = normalizeUserSearch(raw);
  if (!normalized) return null;

  const folded = foldSearchText(normalized);
  const tokens = tokenizeSearch(folded);
  if (!folded) {
    return { sql: " AND 1 = 0", params: [] };
  }

  switch (driver) {
    case "postgres":
      if (tokens.length === 0) {
        return { sql: " AND strpos(busca_texto, ?) > 0", params: [folded] };
      }
      return {
        sql: " AND (search_vector @@ to_tsquery('simple', ?) OR strpos(busca_texto, ?) > 0)",
        params: [toPrefixTsQuery(tokens), folded],
      };
    case "sqlite":
      if (tokens.length === 0) {
        return { sql: " AND instr(coalesce(busca_texto, ''), ?) > 0", params: [folded] };
      }
      return {
        sql: " AND (rowid IN (SELECT rowid FROM clientes_fts WHERE clientes_fts MATCH ?) OR instr(coalesce(busca_texto, ''), ?) > 0)",
        params: [toSqliteMatchQuery(tokens), folded],
      };
    default: {
      const unreachable: never = driver;
      throw new Error(`Driver não suportado: ${String(unreachable)}`);
    }
  }
}
