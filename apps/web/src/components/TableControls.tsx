import type { TableControlsState } from "../hooks/useTableControls";

type Props = {
  controls: TableControlsState;
  total: number;
  pageCount: number;
};

export function TableControls({ controls, total, pageCount }: Props) {
  const { search, setSearch, page, setPage, pageSize, setPageSize } = controls;

  return (
    <div className="table-controls" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
      <input
        type="search"
        placeholder="Buscar…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{ flex: "1 1 200px", maxWidth: 320 }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}>
        Por página
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
        {total} registro{total !== 1 ? "s" : ""}
      </span>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span style={{ alignSelf: "center", fontSize: "0.875rem" }}>
          {page} / {Math.max(1, pageCount)}
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
