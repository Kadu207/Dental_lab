import { getAuthToken, getClinicaId } from "./auth";

function apiBase(): string {
  const configured = (import.meta.env.VITE_DENTAL_LAB_API_URL ?? "").replace(/\/$/, "");
  if (configured) return `${configured}/api`;
  const embedded = import.meta.env.VITE_DENTAL_LAB_EMBEDDED === "true";
  if (embedded) return "/lab-api";
  return "/api";
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getAuthToken();
  if (token) h.Authorization = `Bearer ${token}`;
  const cid = getClinicaId();
  if (cid) h["X-Clinica-Id"] = cid;
  const key = import.meta.env.VITE_DENTAL_LAB_LICENSE_KEY?.trim();
  if (key) h["X-Dental-Lab-License"] = key;
  return h;
}

function resolveUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("/")) return pathOrUrl;
  return `${apiBase()}/${pathOrUrl}`;
}

/** Download or open authenticated URL (print, CSV, HTML) via fetch + blob */
export async function downloadWithAuth(
  pathOrUrl: string,
  options?: { openInNewTab?: boolean; filename?: string },
): Promise<void> {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }));
    throw new Error(err.erro ?? "Erro ao baixar");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  if (options?.openInNewTab) {
    window.open(objectUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = options?.filename ?? "download";
  a.click();
  URL.revokeObjectURL(objectUrl);
}
