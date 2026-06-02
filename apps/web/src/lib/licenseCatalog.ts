/** Catálogo alinhado ao Gerador de Licenças (Excellence Dental / Inova). */

export const LICENSE_PRODUTOS = [
  { value: "cloud", label: "Excellence Dental Cloud" },
  { value: "cloud_lab", label: "Excellence Dental Cloud + Lab" },
  { value: "lab", label: "Dental Lab (standalone)" },
];

export const LICENSE_PERIODOS = [
  { value: "trial7", label: "Teste (7 dias)" },
  { value: "trial", label: "Teste (30 dias)" },
  { value: "1y", label: "1 ano" },
  { value: "2y", label: "2 anos" },
  { value: "4y", label: "4 anos" },
  { value: "5y", label: "5 anos" },
];

export const GERADOR_URL = "https://licencas.inovatitech.com.br";

export const TENANT_MODE_NEW = "__new__";
export const TENANT_MODE_MANUAL = "__manual__";

export function suggestClienteCodigo(seq = 1): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const n = String(seq).padStart(4, "0");
  return `ED-${y}${m}${day}-${n}`;
}

export function tenantLabel(nomeFantasia: string | null, razaoSocial: string | null, clinicaId: number) {
  return nomeFantasia || razaoSocial || `Tenant ${clinicaId}`;
}

export function licenseStatusClass(status: string): string {
  switch (status) {
    case "active":
      return "license-status license-status-active";
    case "revoked":
      return "license-status license-status-revoked";
    case "cancelled":
    case "expired":
      return "license-status license-status-muted";
    default:
      return "license-status license-status-pending";
  }
}
