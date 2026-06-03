/** Odontograma — numeração FDI, condições e layout 3D da arcada */

export type ToothConditionId =
  | "sadio"
  | "carie"
  | "restauracao"
  | "coroa"
  | "canal"
  | "implante"
  | "protese"
  | "extracao"
  | "ausente";

export interface ToothCondition {
  id: ToothConditionId;
  label: string;
  color: string;
  description: string;
}

export const CONDITIONS: ToothCondition[] = [
  { id: "sadio", label: "Saudável", color: "#f1f5f9", description: "Dente íntegro" },
  { id: "carie", label: "Cárie", color: "#dc2626", description: "Lesão de cárie" },
  { id: "restauracao", label: "Restauração", color: "#2563eb", description: "Dente restaurado" },
  { id: "coroa", label: "Coroa", color: "#d97706", description: "Coroa protética" },
  { id: "canal", label: "Canal", color: "#7c3aed", description: "Tratamento de canal" },
  { id: "implante", label: "Implante", color: "#0891b2", description: "Implante dentário" },
  { id: "protese", label: "Prótese", color: "#059669", description: "Prótese" },
  { id: "extracao", label: "Extração indicada", color: "#f97316", description: "Indicado para extração" },
  { id: "ausente", label: "Ausente", color: "#94a3b8", description: "Dente ausente" },
];

export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.id, c])) as Record<
  ToothConditionId,
  ToothCondition
>;

export const UPPER_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export type ToothType = "incisivo" | "canino" | "premolar" | "molar";

export function toothType(fdi: number): ToothType {
  const pos = fdi % 10;
  if (pos <= 2) return "incisivo";
  if (pos === 3) return "canino";
  if (pos <= 5) return "premolar";
  return "molar";
}

export function toothName(fdi: number): string {
  const labels: Record<ToothType, string> = {
    incisivo: "Incisivo",
    canino: "Canino",
    premolar: "Pré-molar",
    molar: "Molar",
  };
  return labels[toothType(fdi)];
}

export interface ToothLayout {
  fdi: number;
  type: ToothType;
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  arch: "upper" | "lower";
}

const TYPE_SIZE: Record<ToothType, [number, number, number]> = {
  incisivo: [0.55, 1.1, 0.45],
  canino: [0.6, 1.25, 0.55],
  premolar: [0.72, 1.0, 0.7],
  molar: [0.95, 0.95, 0.9],
};

function buildRow(fdis: number[], arch: "upper" | "lower"): ToothLayout[] {
  const n = fdis.length;
  const tMax = 1.18;
  const archWidth = 4.6;
  const archDepth = 3.0;
  const y = arch === "upper" ? 0.7 : -0.7;

  return fdis.map((fdi, i) => {
    const frac = n === 1 ? 0.5 : i / (n - 1);
    const t = (frac - 0.5) * 2 * tMax;
    const x = Math.sin(t) * archWidth;
    const z = Math.cos(t) * archDepth - archDepth;
    const type = toothType(fdi);
    return {
      fdi,
      type,
      position: [x, y, z] as [number, number, number],
      rotationY: -t,
      size: TYPE_SIZE[type],
      arch,
    };
  });
}

export function buildArch(): ToothLayout[] {
  return [...buildRow(UPPER_FDI, "upper"), ...buildRow(LOWER_FDI, "lower")];
}

export interface ToothState {
  fdi: number;
  condition: ToothConditionId;
  note?: string | null;
}

export type ToothStateMap = Record<number, ToothState>;

export function statesToMap(states: ToothState[] | undefined): ToothStateMap {
  const map: ToothStateMap = {};
  for (const s of states ?? []) {
    map[s.fdi] = { fdi: s.fdi, condition: s.condition, note: s.note ?? null };
  }
  return map;
}

export function mapToStates(map: ToothStateMap): ToothState[] {
  return Object.values(map)
    .filter((s) => s.condition !== "sadio" || (s.note && s.note.length > 0))
    .sort((a, b) => a.fdi - b.fdi);
}

/** Compat: mescla dentes salvos com arcada completa (legado). */
export function mergeToothStates(saved: ToothState[] | null | undefined): ToothState[] {
  return mapToStates(statesToMap(saved ?? undefined));
}
