const TOKEN_KEY = "lab_token";
const CLINICA_KEY = "lab_clinica_id";
const USER_KEY = "lab_user";

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

export function getClinicaId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(CLINICA_KEY) ||
    (IS_EMBEDDED ? localStorage.getItem("clinica_id") : null)
  );
}

export function setLabSession(data: {
  token: string;
  clinicaId: number | string;
  nome: string;
  perfil: string;
}) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(CLINICA_KEY, String(data.clinicaId));
  localStorage.setItem(USER_KEY, JSON.stringify({ nome: data.nome, perfil: data.perfil }));
}

export function clearLabSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLINICA_KEY);
  localStorage.removeItem(USER_KEY);
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
