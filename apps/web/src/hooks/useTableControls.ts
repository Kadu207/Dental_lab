import { useMemo, useState } from "react";

export type TableControlsState = {
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  sortKey: string;
  setSortKey: (v: string) => void;
  sortOrder: "asc" | "desc";
  toggleSort: (key: string) => void;
};

export function useTableControls(initialSort = "nome"): TableControlsState {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return useMemo(
    () => ({
      search,
      setSearch,
      page,
      setPage,
      pageSize,
      setPageSize,
      sortKey,
      setSortKey,
      sortOrder,
      toggleSort,
    }),
    [search, page, pageSize, sortKey, sortOrder],
  );
}
