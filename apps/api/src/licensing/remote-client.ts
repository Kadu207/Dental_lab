import { LICENSE_SERVER_API_KEY, LICENSE_SERVER_URL } from "../config.js";

export type RemoteLicensePayload = {
  valid?: boolean;
  hasLicense?: boolean;
  status?: string;
  phase?: string;
  produto?: string;
  produtoLabel?: string;
  periodo?: string;
  periodoLabel?: string;
  startsAt?: string;
  endsAt?: string;
  paymentDueAt?: string;
  daysLeft?: number;
  daysRemaining?: number;
  licenseExpired?: boolean;
  paymentPhase?: string;
  licenseKeyMasked?: string;
  clinicaId?: number;
  unidadeId?: string | null;
  message?: string;
  alertLevel?: string;
  source?: string;
};

export type RemoteHeartbeatPayload = {
  valid: boolean;
  blocked: boolean;
  licenseExpired?: boolean;
  paymentPhase?: string;
  daysRemaining?: number;
  alertLevel?: string;
  reason?: string;
};

export class LicenseServerError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const PRODUCT = "lab";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (LICENSE_SERVER_API_KEY) h["X-License-Api-Key"] = LICENSE_SERVER_API_KEY;
  return h;
}

export function isRemoteLicenseEnabled(): boolean {
  return Boolean(LICENSE_SERVER_URL && LICENSE_SERVER_API_KEY);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseError(res: Response): Promise<LicenseServerError> {
  const body = (await res.json().catch(() => ({}))) as { detail?: string; erro?: string; code?: string };
  const detail = body.detail ?? body.erro ?? res.statusText;
  const known = typeof detail === "string" && /^LICENSE_[A-Z0-9_]+$/.test(detail) ? detail : null;
  const code = body.code ?? known ?? "LICENSE_SERVER_ERROR";
  return new LicenseServerError(String(detail), code, res.status);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LICENSE_SERVER_UNREACHABLE");
}

export async function remoteValidateLicense(input: {
  licenseKey: string;
  clinicaId: number;
  unidadeId?: string | null;
}): Promise<RemoteLicensePayload> {
  if (!isRemoteLicenseEnabled()) throw new LicenseServerError("Servidor de licenças não configurado", "NO_SERVER", 503);
  const res = await fetchWithRetry(`${LICENSE_SERVER_URL}/api/v1/licenses/validate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      license_key: input.licenseKey,
      clinica_id: input.clinicaId,
      unidade_id: input.unidadeId ?? null,
      product: PRODUCT,
    }),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as RemoteLicensePayload;
}

export async function remoteActivateLicense(input: {
  licenseKey: string;
  clinicaId: number;
  unidadeId?: string | null;
  installationId?: string;
}): Promise<RemoteLicensePayload> {
  if (!isRemoteLicenseEnabled()) throw new LicenseServerError("Servidor de licenças não configurado", "NO_SERVER", 503);
  const res = await fetchWithRetry(`${LICENSE_SERVER_URL}/api/v1/licenses/activate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      license_key: input.licenseKey,
      clinica_id: input.clinicaId,
      unidade_id: input.unidadeId ?? null,
      product: PRODUCT,
      installation_id: input.installationId,
    }),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { licenca?: RemoteLicensePayload };
  return data.licenca ?? (data as RemoteLicensePayload);
}

export async function remoteLicenseStatus(input: {
  clinicaId: number;
  unidadeId?: string | null;
  licenseKey?: string;
}): Promise<RemoteLicensePayload> {
  if (!isRemoteLicenseEnabled()) throw new LicenseServerError("Servidor de licenças não configurado", "NO_SERVER", 503);
  const params = new URLSearchParams({
    clinica_id: String(input.clinicaId),
    product: PRODUCT,
  });
  if (input.unidadeId) params.set("unidade_id", input.unidadeId);
  if (input.licenseKey) params.set("license_key", input.licenseKey);
  const res = await fetchWithRetry(`${LICENSE_SERVER_URL}/api/v1/licenses/status?${params}`, {
    headers: headers(),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as RemoteLicensePayload;
}

export async function remoteLicenseHeartbeat(licenseKey: string): Promise<RemoteHeartbeatPayload> {
  if (!isRemoteLicenseEnabled()) throw new LicenseServerError("Servidor de licenças não configurado", "NO_SERVER", 503);
  const params = new URLSearchParams({ license_key: licenseKey, product: PRODUCT });
  const res = await fetchWithRetry(`${LICENSE_SERVER_URL}/api/v1/licenses/heartbeat?${params}`, {
    headers: headers(),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as RemoteHeartbeatPayload;
}
