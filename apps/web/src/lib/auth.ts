const TOKEN_KEY = "lab_token";
const CLINICA_KEY = "lab_clinica_id";
const USER_KEY = "lab_user";
const PLATFORM_USER_KEY = "lab_platform_user";
const SUPERVISOR_TENANT_KEY = "lab_supervisor_tenant_id";

function urlEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("embedded") === "1" || q.get("embedded") === "true";
}

/** Modo integrado: build-time ou query `?embedded=1` (iframe no Excellence). */
export const IS_EMBEDDED =
  import.meta.env.VITE_DENTAL_LAB_EMBEDDED === "true" ||
  import.meta.env.VITE_DENTAL_LAB_DEPLOYMENT_MODE === "embedded" ||
  urlEmbedded();

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(TOKEN_KEY) ||
    (IS_EMBEDDED ? localStorage.getItem("token") : null)
  );
}

/** Supervisor ou admin de plataforma (integrações). */
export function canAccessSupervisorConsole(perfil: string | null): boolean {
  if (!perfil) return false;
  if (perfil === "supervisor") return true;
  return perfil === "admin" && isPlatformUser();
}

export function getClinicaId(): string | null {
  if (typeof window === "undefined") return null;
  if (isPlatformUser()) {
    return localStorage.getItem(SUPERVISOR_TENANT_KEY);
  }
  return (
    localStorage.getItem(CLINICA_KEY) ||
    (IS_EMBEDDED ? localStorage.getItem("clinica_id") : null)
  );
}

export function getSupervisorTenantId(): number | null {
  const raw = localStorage.getItem(SUPERVISOR_TENANT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setSupervisorTenantId(clinicaId: number | null) {
  if (clinicaId == null || clinicaId <= 0) {
    localStorage.removeItem(SUPERVISOR_TENANT_KEY);
    return;
  }
  localStorage.setItem(SUPERVISOR_TENANT_KEY, String(clinicaId));
}

export function isPlatformUser(): boolean {
  return localStorage.getItem(PLATFORM_USER_KEY) === "1";
}

export function setLabSession(data: {
  token: string;
  clinicaId: number | string;
  nome: string;
  perfil: string;
  isPlatformUser?: boolean;
}) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(CLINICA_KEY, String(data.clinicaId));
  localStorage.setItem(USER_KEY, JSON.stringify({ nome: data.nome, perfil: data.perfil }));
  if (data.isPlatformUser || data.perfil === "supervisor") {
    localStorage.setItem(PLATFORM_USER_KEY, "1");
    localStorage.removeItem(SUPERVISOR_TENANT_KEY);
  } else {
    localStorage.removeItem(PLATFORM_USER_KEY);
  }
}

export function clearLabSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLINICA_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PLATFORM_USER_KEY);
  localStorage.removeItem(SUPERVISOR_TENANT_KEY);
}

export function getLabUser(): { nome: string; perfil: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}
