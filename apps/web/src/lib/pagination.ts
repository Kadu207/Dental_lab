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

export function buildListQuery(params: ListParams = {}): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  if (params.search) qs.set("search", params.search);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function compareValues(a: unknown, b: unknown, dir: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }) * dir;
}

export function normalizeList<T>(
  res: unknown,
  params: ListParams = {},
  getSearchText?: (item: T) => string,
): Paged<T> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 10);

  if (res && typeof res === "object" && !Array.isArray(res)) {
    const obj = res as Record<string, unknown>;
    const arr = (obj.items ?? obj.data ?? obj.rows ?? obj.results) as T[] | undefined;
    if (Array.isArray(arr)) {
      const total = Number(obj.total ?? obj.count ?? obj.totalCount ?? arr.length);
      return {
        items: arr,
        total: Number.isFinite(total) ? total : arr.length,
        page: Number(obj.page ?? page),
        limit: Number(obj.limit ?? obj.pageSize ?? limit),
      };
    }
  }

  if (Array.isArray(res)) {
    let items = res as T[];
    const q = params.search?.trim().toLowerCase();
    if (q && getSearchText) {
      items = items.filter((it) => getSearchText(it).toLowerCase().includes(q));
    }
    if (params.sort) {
      const field = params.sort;
      const dir = params.order === "desc" ? -1 : 1;
      items = [...items].sort((a, b) =>
        compareValues(
          (a as Record<string, unknown>)[field],
          (b as Record<string, unknown>)[field],
          dir,
        ),
      );
    }
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total, page, limit };
  }

  return { items: [], total: 0, page, limit };
}
