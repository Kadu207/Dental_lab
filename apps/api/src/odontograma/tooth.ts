export const TOOTH_CONDITION_IDS = [
  "sadio",
  "carie",
  "restauracao",
  "coroa",
  "canal",
  "implante",
  "protese",
  "extracao",
  "ausente",
] as const;

export type ToothConditionId = (typeof TOOTH_CONDITION_IDS)[number];

const CONDITION_SET = new Set<string>(TOOTH_CONDITION_IDS);

const PERMANENT_FDI = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41,
  42, 43, 44, 45, 46, 47, 48,
]);

const NOTE_MAX = 500;

export type ToothPayload = { fdi: number; condition: ToothConditionId; note?: string };

export class OdontogramaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OdontogramaValidationError";
  }
}

export function isToothConditionId(value: string): value is ToothConditionId {
  return CONDITION_SET.has(value);
}

export function isPermanentFdi(fdi: number): boolean {
  return Number.isInteger(fdi) && PERMANENT_FDI.has(fdi);
}

function normalizeNote(note: unknown): string | undefined {
  if (note == null || note === "") return undefined;
  const s = String(note).trim();
  if (!s) return undefined;
  return s.length > NOTE_MAX ? s.slice(0, NOTE_MAX) : s;
}

function coerceCondition(raw: unknown): ToothConditionId {
  const value = raw == null || raw === "" ? "sadio" : String(raw);
  return isToothConditionId(value) ? value : "sadio";
}

/** Leitura: ignora FDI inválido e força condição desconhecida para sadio. */
export function parseDentesLenient(raw: unknown): ToothPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: ToothPayload[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const fdi = Number(rec.fdi);
    if (!isPermanentFdi(fdi) || seen.has(fdi)) continue;
    seen.add(fdi);
    out.push({ fdi, condition: coerceCondition(rec.condition), note: normalizeNote(rec.note) });
  }
  return out;
}

/** Escrita: rejeita array inválido, FDI fora da arcada permanente e condição fora da allowlist. */
export function parseDentesStrict(raw: unknown): ToothPayload[] {
  if (!Array.isArray(raw)) {
    throw new OdontogramaValidationError("Campo dentes deve ser um array");
  }
  const out: ToothPayload[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      throw new OdontogramaValidationError("Cada dente deve ser um objeto");
    }
    const rec = item as Record<string, unknown>;
    const fdi = Number(rec.fdi);
    if (!isPermanentFdi(fdi)) {
      throw new OdontogramaValidationError("Número FDI inválido");
    }
    if (seen.has(fdi)) {
      throw new OdontogramaValidationError("FDI duplicado no odontograma");
    }
    seen.add(fdi);
    const condRaw = rec.condition ?? "sadio";
    if (typeof condRaw !== "string" || !isToothConditionId(condRaw)) {
      throw new OdontogramaValidationError("Condição de dente inválida");
    }
    out.push({ fdi, condition: condRaw, note: normalizeNote(rec.note) });
  }
  return out;
}

export function resolveDentesPayload(body: unknown): ToothPayload[] {
  if (body == null || typeof body !== "object") {
    throw new OdontogramaValidationError("Campo dentes deve ser um array");
  }
  const rec = body as Record<string, unknown>;
  if (rec.dentes !== undefined) {
    return parseDentesStrict(rec.dentes);
  }
  if (Array.isArray(body)) {
    return parseDentesStrict(body);
  }
  return [];
}
