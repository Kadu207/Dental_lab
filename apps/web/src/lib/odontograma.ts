/** Domínio odontograma — numeração FDI e condições clínicas */

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

export type ToothType = "incisivo" | "canino" | "premolar" | "molar";

export interface ToothCondition {
  id: ToothConditionId;
  label: string;
  color: string;
}

export const CONDITIONS: ToothCondition[] = [
  { id: "sadio", label: "Sadio", color: "#e2e8f0" },
  { id: "carie", label: "Cárie", color: "#dc2626" },
  { id: "restauracao", label: "Restauração", color: "#2563eb" },
  { id: "coroa", label: "Coroa", color: "#7c3aed" },
  { id: "canal", label: "Canal", color: "#d97706" },
  { id: "implante", label: "Implante", color: "#059669" },
  { id: "protese", label: "Prótese", color: "#0891b2" },
  { id: "extracao", label: "Extração", color: "#64748b" },
  { id: "ausente", label: "Ausente", color: "#1e293b" },
];

export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.id, c])) as Record<
  ToothConditionId,
  ToothCondition
>;

export interface ToothState {
  fdi: number;
  condition: ToothConditionId;
  note?: string;
}

export interface ArchToothLayout {
  fdi: number;
  type: ToothType;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function toothType(fdi: number): ToothType {
  const n = fdi % 10;
  if (n === 1 || n === 2) return "incisivo";
  if (n === 3) return "canino";
  if (n === 4 || n === 5) return "premolar";
  return "molar";
}

function archRow(teeth: number[], y: number, spread = 0.42): ArchToothLayout[] {
  const n = teeth.length;
  return teeth.map((fdi, i) => {
    const t = (i / (n - 1)) * 2 - 1;
    const x = t * spread;
    const rot = (Math.atan2(t * 0.3, 1) * 180) / Math.PI;
    const type = toothType(fdi);
    const scale = type === "molar" ? 1.15 : type === "premolar" ? 1 : type === "canino" ? 0.9 : 0.85;
    return { fdi, type, x, y, rotation: rot, scale };
  });
}

export function buildArch(): ArchToothLayout[] {
  return [...archRow(UPPER, 0.55), ...archRow(LOWER, -0.55)];
}

export function defaultToothStates(): ToothState[] {
  return buildArch().map((t) => ({ fdi: t.fdi, condition: "sadio" }));
}

export function mergeToothStates(saved: ToothState[] | null | undefined): ToothState[] {
  const base = defaultToothStates();
  if (!saved?.length) return base;
  const map = new Map(saved.map((s) => [s.fdi, s]));
  return base.map((t) => {
    const s = map.get(t.fdi);
    return s ? { ...t, condition: s.condition, note: s.note } : t;
  });
}

export function statesToMap(states: ToothState[]): Record<number, ToothState> {
  return Object.fromEntries(states.map((s) => [s.fdi, s]));
}
