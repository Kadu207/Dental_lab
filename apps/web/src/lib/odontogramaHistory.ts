import type { ToothState } from "./odontograma";

export interface OdontogramaVersion {
  id: string;
  savedAt: string;
  count: number;
  dentes: ToothState[];
}

const MAX_VERSIONS = 40;

function key(pacienteId: string | number): string {
  return `odontograma:history:${pacienteId}`;
}

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getHistory(pacienteId: string | number): OdontogramaVersion[] {
  if (typeof window === "undefined" || !pacienteId) return [];
  try {
    const raw = window.localStorage.getItem(key(pacienteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OdontogramaVersion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushVersion(pacienteId: string | number, dentes: ToothState[]): OdontogramaVersion {
  const version: OdontogramaVersion = {
    id: genId(),
    savedAt: new Date().toISOString(),
    count: dentes.length,
    dentes,
  };
  if (typeof window === "undefined" || !pacienteId) return version;
  try {
    const next = [version, ...getHistory(pacienteId)].slice(0, MAX_VERSIONS);
    window.localStorage.setItem(key(pacienteId), JSON.stringify(next));
  } catch {
    /* storage full */
  }
  return version;
}

export function clearHistory(pacienteId: string | number): void {
  if (typeof window === "undefined" || !pacienteId) return;
  try {
    window.localStorage.removeItem(key(pacienteId));
  } catch {
    /* ignore */
  }
}

export function formatVersionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
