import type { LabDbClient } from "../db/client.js";
import { withLabClient } from "../db/client.js";
import { listTenants } from "../tenants/registry.js";
import { refreshLicenseStatus } from "./core.js";
import {
  isRemoteLicenseEnabled,
  remoteLicenseHeartbeat,
  remoteLicenseStatus,
  type RemoteLicensePayload,
} from "./remote-client.js";
import { listLicensesForTenant } from "./tenant-licenses.js";
import { setCachedRemoteStatus } from "./service.js";

export type TenantLicenseSyncResult = {
  clinicaId: number;
  skipped?: boolean;
  remoteValid?: boolean;
  licenseExpired?: boolean;
  licensesUpdated: number;
  error?: string;
};

function remoteStatusPayload(remote: RemoteLicensePayload, clinicaId: number): Record<string, unknown> {
  const daysLeft = remote.daysLeft ?? remote.daysRemaining ?? 0;
  const valid = remote.valid ?? remote.hasLicense ?? false;
  return {
    hasLicense: valid,
    valid,
    status: remote.status ?? (valid ? "active" : "none"),
    phase: remote.phase ?? remote.paymentPhase,
    produto: remote.produto ?? "lab",
    periodo: remote.periodo ?? "",
    startsAt: remote.startsAt ?? "",
    endsAt: remote.endsAt ?? "",
    daysLeft,
    daysRemaining: daysLeft,
    licenseExpired: remote.licenseExpired ?? false,
    paymentPhase: remote.paymentPhase,
    alertLevel: remote.alertLevel ?? "none",
    alertMessage: remote.message ?? "",
    isTrial: false,
    source: remote.source ?? "license-server",
    remoteEnabled: true,
    clinicaId,
    syncedAt: new Date().toISOString(),
  };
}

function remoteIndicatesExpired(remote: RemoteLicensePayload): boolean {
  if (remote.licenseExpired === true) return true;
  const status = String(remote.status ?? "").toLowerCase();
  return status === "expired" || status === "revoked" || status === "blocked";
}

async function applyRemoteToTenantDb(
  db: LabDbClient,
  clinicaId: number,
  remote: RemoteLicensePayload,
): Promise<number> {
  const rows = await listLicensesForTenant(db, clinicaId);
  let updated = 0;
  const valid = remote.valid ?? remote.hasLicense ?? false;
  const expired = remoteIndicatesExpired(remote);

  for (const row of rows) {
    const current = refreshLicenseStatus(row);

    if (expired || (!valid && current === "active")) {
      if (current === "active" || row.status === "active") {
        await db.run("UPDATE product_licenses SET status = 'expired' WHERE id = ? AND clinica_id = ?", [
          row.id,
          clinicaId,
        ]);
        updated++;
      }
      continue;
    }

    if (valid && remote.endsAt && (current === "active" || row.status === "active")) {
      if (row.ends_at !== remote.endsAt) {
        await db.run(
          "UPDATE product_licenses SET ends_at = ?, status = 'active' WHERE id = ? AND clinica_id = ?",
          [remote.endsAt, row.id, clinicaId],
        );
        updated++;
      }
    }
  }

  return updated;
}

/** Consulta Gerador e alinha product_licenses + cache local do tenant. */
export async function syncTenantLicenseFromRemote(clinicaId: number): Promise<TenantLicenseSyncResult> {
  if (!isRemoteLicenseEnabled()) {
    return { clinicaId, skipped: true, licensesUpdated: 0 };
  }

  try {
    const remote = await remoteLicenseStatus({ clinicaId, unidadeId: null });
    const payload = remoteStatusPayload(remote, clinicaId);
    setCachedRemoteStatus(clinicaId, null, payload);

    const licensesUpdated = await withLabClient(clinicaId, async (db) =>
      applyRemoteToTenantDb(db, clinicaId, remote),
    );

    return {
      clinicaId,
      remoteValid: remote.valid ?? remote.hasLicense ?? false,
      licenseExpired: remoteIndicatesExpired(remote),
      licensesUpdated,
    };
  } catch (e) {
    return {
      clinicaId,
      licensesUpdated: 0,
      error: e instanceof Error ? e.message : "Falha ao sincronizar licença remota",
    };
  }
}

/** Sincroniza todos os tenants registrados + heartbeat por chave ativa. */
export async function syncAllTenantLicensesFromRemote(): Promise<TenantLicenseSyncResult[]> {
  if (!isRemoteLicenseEnabled()) return [];

  const tenants = await listTenants();
  const results: TenantLicenseSyncResult[] = [];

  for (const tenant of tenants) {
    if (tenant.status !== "active") continue;
    results.push(await syncTenantLicenseFromRemote(tenant.clinicaId));
  }

  for (const tenant of tenants) {
    if (tenant.status !== "active") continue;
    try {
      const rows = await withLabClient(tenant.clinicaId, async (db) =>
        listLicensesForTenant(db, tenant.clinicaId),
      );
      for (const lic of rows) {
        if (lic.status !== "active" || !lic.license_key) continue;
        try {
          const hb = await remoteLicenseHeartbeat(lic.license_key);
          if (hb.blocked || hb.licenseExpired) {
            await withLabClient(tenant.clinicaId, async (db) => {
              await db.run("UPDATE product_licenses SET status = 'expired' WHERE id = ? AND clinica_id = ?", [
                lic.id,
                tenant.clinicaId,
              ]);
            });
          }
        } catch (err) {
          console.warn(
            `[license-sync] Heartbeat clinica=${tenant.clinicaId}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch {
      /* tenant schema indisponível */
    }
  }

  return results;
}
