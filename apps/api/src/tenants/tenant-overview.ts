import { buildStatusWithTrial } from "../licensing/service.js";
import { withLabClient } from "../db/client.js";
import { listTenants, type TenantRecord } from "./registry.js";

export interface TenantOverview extends TenantRecord {
  licenseStatus: string;
  licenseStatusLabel: string;
  licenseProduto: string | null;
  licensePeriodo: string | null;
  licenseDaysLeft: number | null;
}

function licenseStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "trial":
      return "Trial";
    case "expired":
      return "Expirada";
    case "revoked":
      return "Revogada";
    case "pending":
      return "Pendente";
    case "none":
      return "Sem licença";
    default:
      return status;
  }
}

export async function listTenantsOverview(): Promise<TenantOverview[]> {
  const tenants = await listTenants();
  const rows = await Promise.all(
    tenants.map(async (tenant) => {
      let local: Record<string, unknown> = { status: "none" };
      try {
        local = await withLabClient(tenant.clinicaId, async (db) =>
          buildStatusWithTrial(db, tenant.clinicaId, null),
        );
      } catch {
        /* schema indisponível */
      }
      const status = String(local.status ?? local.phase ?? "none");
      return {
        ...tenant,
        licenseStatus: status,
        licenseStatusLabel: licenseStatusLabel(status),
        licenseProduto: local.produtoLabel != null ? String(local.produtoLabel) : null,
        licensePeriodo: local.periodoLabel != null ? String(local.periodoLabel) : null,
        licenseDaysLeft:
          local.daysLeft != null && Number.isFinite(Number(local.daysLeft))
            ? Number(local.daysLeft)
            : null,
      } satisfies TenantOverview;
    }),
  );
  return rows;
}
