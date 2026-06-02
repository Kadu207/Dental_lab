type PaginationBarProps = {
  total: number;
  limit: number;
  offset: number;
  onPage: (offset: number) => void;
};

export function PaginationBar({ total, limit, offset, onPage }: PaginationBarProps) {
  if (total <= limit) return null;

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="pagination-bar" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
      <button type="button" className="btn btn-outline btn-sm" disabled={offset <= 0} onClick={() => onPage(0)}>
        «
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={offset <= 0}
        onClick={() => onPage(Math.max(0, offset - limit))}
      >
        Anterior
      </button>
      <span className="muted">
        Página {page} de {pages} ({total} registros)
      </span>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={offset + limit >= total}
        onClick={() => onPage(offset + limit)}
      >
        Próxima
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={offset + limit >= total}
        onClick={() => onPage((pages - 1) * limit)}
      >
        »
      </button>
    </div>
  );
}

export const DEFAULT_PAGE_SIZE = 50;
