export const SETORES_LAB = [
  { id: "gesso", label: "Gesso / Modelagem", cor: "#3b82f6" },
  { id: "ceramica", label: "Cerâmica", cor: "#8b5cf6" },
  { id: "acabamento", label: "Acabamento", cor: "#059669" },
  { id: "entrega", label: "Entrega", cor: "#d97706" },
] as const;

export type SetorLab = (typeof SETORES_LAB)[number]["id"];

export function labelSetor(id?: string | null): string {
  return SETORES_LAB.find((s) => s.id === id)?.label ?? id ?? "—";
}
