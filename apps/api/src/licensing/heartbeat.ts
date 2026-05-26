import { listLicenses } from "./service.js";
import { isRemoteLicenseEnabled, remoteLicenseHeartbeat } from "./remote-client.js";

const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function runHeartbeatCycle(): Promise<void> {
  if (!isRemoteLicenseEnabled()) return;

  const rows = await listLicenses(500);
  const active = rows.filter((row) => row.status === "active" && row.license_key);

  for (const lic of active) {
    try {
      const hb = await remoteLicenseHeartbeat(lic.license_key);
      if (hb.blocked) {
        console.warn(
          `[license-heartbeat] Licença bloqueada (clinica=${lic.clinica_id}, key=****${lic.license_key.slice(-4)})`,
        );
      }
    } catch (err) {
      console.warn(
        `[license-heartbeat] Falha clinica=${lic.clinica_id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export function startLicenseHeartbeat(): void {
  if (!isRemoteLicenseEnabled()) return;

  void runHeartbeatCycle();
  setInterval(() => {
    void runHeartbeatCycle();
  }, HEARTBEAT_INTERVAL_MS);

  console.log("[license-heartbeat] Poll remoto a cada 6h ativo");
}
