import type { ToothState } from "./odontograma";

const PREFIX = "odontograma:history:";
const MAX_VERSIONS = 40;

export type OdontogramaVersion = {
  id: string;
  savedAt: string;
  dentes: ToothState[];
};

function key(pacienteId: string): string {
  return `${PREFIX}${pacienteId}`;
}

export function getHistory(pacienteId: string): OdontogramaVersion[] {
  try {
    const raw = localStorage.getItem(key(pacienteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OdontogramaVersion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushVersion(pacienteId: string, dentes: ToothState[]): OdontogramaVersion[] {
  const list = getHistory(pacienteId);
  const entry: OdontogramaVersion = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    dentes,
  };
  const next = [entry, ...list].slice(0, MAX_VERSIONS);
  localStorage.setItem(key(pacienteId), JSON.stringify(next));
  return next;
}

export function clearHistory(pacienteId: string): void {
  localStorage.removeItem(key(pacienteId));
}

export function formatVersionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}
