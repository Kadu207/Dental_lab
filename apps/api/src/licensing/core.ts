import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const LICENSE_KEY_LEN = 25;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const PRODUCT_CLOUD = "cloud";
export const PRODUCT_CLOUD_LAB = "cloud_lab";
export const PRODUCT_LAB = "lab";
export const ALLOWED_PRODUCTS = new Set([PRODUCT_CLOUD, PRODUCT_CLOUD_LAB, PRODUCT_LAB]);

export const PERIOD_TRIAL = "trial";
export const PERIOD_1Y = "1y";
export const PERIOD_2Y = "2y";
export const PERIOD_4Y = "4y";
export const PERIOD_5Y = "5y";
export const ALLOWED_PERIODS = new Set([PERIOD_TRIAL, PERIOD_1Y, PERIOD_2Y, PERIOD_4Y, PERIOD_5Y]);

export const PERIOD_DAYS: Record<string, number> = {
  trial: 30,
  "1y": 365,
  "2y": 730,
  "4y": 1460,
  "5y": 1825,
};

export const PRODUCT_LABELS: Record<string, string> = {
  cloud: "Excellence Dental Cloud",
  cloud_lab: "Excellence Dental Cloud + Lab",
  lab: "Dental Lab (standalone)",
};

export const PERIOD_LABELS: Record<string, string> = {
  trial: "Teste (30 dias)",
  "1y": "1 ano",
  "2y": "2 anos",
  "4y": "4 anos",
  "5y": "5 anos",
};

export type LicenseRow = {
  id: number;
  license_key: string;
  clinica_id: number | null;
  unidade_id: string | null;
  produto: string;
  periodo: string;
  cliente_nome: string;
  starts_at: string;
  ends_at: string;
  status: string;
  activated_at: string | null;
  lab_secret: string | null;
  created_at: string;
  created_by: string;
  notes: string;
};

export function nowTs(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function parseTs(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.trim().replace("T", " ").replace("Z", "");
  const d = new Date(raw.includes(" ") ? raw : `${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function generateLicenseKey(): string {
  const bytes = randomBytes(LICENSE_KEY_LEN);
  let out = "";
  for (let i = 0; i < LICENSE_KEY_LEN; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function generateLabSecret(): string {
  return randomBytes(32).toString("hex");
}

export function normalizeLicenseKey(key: string | null | undefined): string {
  return (key ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, LICENSE_KEY_LEN);
}

export function isValidLicenseKeyFormat(key: string | null | undefined): boolean {
  const n = normalizeLicenseKey(key);
  return n.length === LICENSE_KEY_LEN && /^[A-Z0-9]+$/.test(n);
}

export function computeEndsAt(startsAt: string, periodo: string): string {
  const start = parseTs(startsAt) ?? new Date();
  const days = PERIOD_DAYS[periodo] ?? PERIOD_DAYS.trial!;
  const end = new Date(start.getTime() + days * 86_400_000);
  return end.toISOString().slice(0, 19).replace("T", " ");
}

export function refreshLicenseStatus(row: LicenseRow, now = new Date()): string {
  if (row.status === "revoked") return "revoked";
  const ends = parseTs(row.ends_at);
  if (ends && ends <= now) return "expired";
  if (row.status === "pending") return "pending";
  return "active";
}

export function licenseTimeLeft(endsAt: string | null | undefined, now = new Date()): { daysLeft: number; hoursLeft: number } {
  const end = parseTs(endsAt);
  if (!end) return { daysLeft: 0, hoursLeft: 0 };
  const ms = Math.max(0, end.getTime() - now.getTime());
  return {
    hoursLeft: Math.floor(ms / 3_600_000),
    daysLeft: Math.ceil(ms / 86_400_000),
  };
}

export function alertLevel(status: string, daysLeft: number): string {
  if (status === "expired" || status === "revoked" || daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "critical";
  if (daysLeft <= 30) return "warning";
  if (daysLeft <= 60) return "info";
  return "none";
}

export function licenseStatusPayload(row: LicenseRow | null): Record<string, unknown> {
  if (!row) {
    return {
      hasLicense: false,
      status: "none",
      produto: "",
      produtoLabel: "",
      periodo: "",
      periodoLabel: "",
      licenseKeyMasked: "",
      startsAt: "",
      endsAt: "",
      daysLeft: 0,
      hoursLeft: 0,
      alertLevel: "expired",
      alertMessage: "Nenhuma licença ativa. Insira a chave de 25 caracteres ou contate suporte/comercial.",
      clienteNome: "",
    };
  }
  const status = refreshLicenseStatus(row);
  const { daysLeft, hoursLeft } = licenseTimeLeft(row.ends_at);
  const level = alertLevel(status, daysLeft);
  const produtoLabel = PRODUCT_LABELS[row.produto] ?? row.produto;
  let alertMessage = "";
  if (level === "expired") {
    alertMessage = `A licença do ${produtoLabel} expirou. Contate suporte/comercial para renovar ou cancelar.`;
  } else if (level === "critical") {
    alertMessage = `A licença expira em ${daysLeft} dia(s). Contate suporte/comercial.`;
  } else if (level === "warning") {
    alertMessage = `A licença expira em ${daysLeft} dias. Planeje a renovação.`;
  } else if (level === "info") {
    alertMessage = `A licença expira em ${daysLeft} dias.`;
  }

  return {
    hasLicense: status === "active",
    status,
    produto: row.produto,
    produtoLabel,
    periodo: row.periodo,
    periodoLabel: PERIOD_LABELS[row.periodo] ?? row.periodo,
    licenseKeyMasked: row.license_key.length >= 8 ? `****${row.license_key.slice(-4)}` : "****",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    daysLeft,
    hoursLeft,
    alertLevel: level,
    alertMessage,
    clienteNome: row.cliente_nome ?? "",
  };
}

export function safeCompare(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function verifyHmacToken(header: string, secret: string): boolean {
  const parts = header.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expected = createHmac("sha256", secret).update(parts[0]).digest("hex");
  if (!safeCompare(parts[1].toLowerCase(), expected.toLowerCase())) return false;
  const t = Number(parts[0]);
  if (!Number.isFinite(t)) return false;
  return Math.abs(Date.now() - t) <= 10 * 60 * 1000;
}

export function productIncludesLab(produto: string | null | undefined): boolean {
  return produto === PRODUCT_CLOUD_LAB || produto === PRODUCT_LAB;
}
