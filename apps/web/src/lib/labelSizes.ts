export type TamanhoEtiqueta = "termica_100x50" | "termica_50x30" | "a4";

export const TAMANHOS_ETIQUETA: { value: TamanhoEtiqueta; label: string; hint?: string }[] = [
  { value: "termica_100x50", label: "Térmica 100×50 mm", hint: "Zebra ZD230 — padrão recomendado" },
  { value: "termica_50x30", label: "Térmica 50×30 mm", hint: "Impressoras estreitas (Brother QL, etc.)" },
  { value: "a4", label: "A4 (prévia / laser)", hint: "Teste ou impressora comum" },
];

const STORAGE_KEY = "lab_tamanho_etiqueta";

export function readTamanhoLocal(): TamanhoEtiqueta {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "termica_50x30" || v === "a4" || v === "termica_100x50") return v;
  return "termica_100x50";
}

export function saveTamanhoLocal(value: TamanhoEtiqueta) {
  localStorage.setItem(STORAGE_KEY, value);
}

export function resolveTamanho(config?: { tamanhoEtiquetaPadrao?: TamanhoEtiqueta }): TamanhoEtiqueta {
  return config?.tamanhoEtiquetaPadrao ?? readTamanhoLocal();
}
