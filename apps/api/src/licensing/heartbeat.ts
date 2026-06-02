import { isRemoteLicenseEnabled } from "./remote-client.js";
import { syncAllTenantLicensesFromRemote } from "./tenant-sync.js";

const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function runHeartbeatCycle(): Promise<void> {
  if (!isRemoteLicenseEnabled()) return;

  const results = await syncAllTenantLicensesFromRemote();
  for (const r of results) {
    if (r.error) {
      console.warn(`[license-sync] clinica=${r.clinicaId}: ${r.error}`);
    } else if (r.licensesUpdated > 0) {
      console.log(`[license-sync] clinica=${r.clinicaId}: ${r.licensesUpdated} licença(s) atualizada(s)`);
    }
  }
}

export function startLicenseHeartbeat(): void {
  if (!isRemoteLicenseEnabled()) return;

  void runHeartbeatCycle();
  setInterval(() => {
    void runHeartbeatCycle();
  }, HEARTBEAT_INTERVAL_MS);

  console.log("[license-sync] Poll Gerador a cada 6h ativo (tenants + heartbeat por chave)");
}
