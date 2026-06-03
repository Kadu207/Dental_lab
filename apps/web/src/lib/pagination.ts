export type SortOrder = "asc" | "desc";

export type ListParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: SortOrder;
  search?: string;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export function buildListQuery(params: ListParams): string {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  if (params.search?.trim()) q.set("search", params.search.trim());
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Aceita array puro ou envelope paginado da API */
export function normalizeList<T>(data: T[] | Paged<T> | null | undefined): Paged<T> {
  if (!data) return { items: [], total: 0, page: 1, limit: 0 };
  if (Array.isArray(data)) return { items: data, total: data.length, page: 1, limit: data.length };
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? data.items?.length ?? 0,
  };
}
