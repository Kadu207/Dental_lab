import path from "path";

/** Raiz do storage de arquivos do lab (pastas de pacientes / jobs CAM). */
export const STORAGE_ROOT = path.resolve(
  process.env.DENTAL_LAB_STORAGE_ROOT?.trim() || path.join(process.cwd(), "data", "lab"),
);

export function pacienteStorageDir(clinicaId: number, pacienteId: string): string {
  return path.join(STORAGE_ROOT, String(clinicaId), "pacientes", sanitizeId(pacienteId));
}

export function scansDir(clinicaId: number, pacienteId: string): string {
  return path.join(pacienteStorageDir(clinicaId, pacienteId), "scans");
}

export function anexosDir(clinicaId: number, pacienteId: string): string {
  return path.join(pacienteStorageDir(clinicaId, pacienteId), "anexos");
}

export function jobsDir(clinicaId: number, pacienteId: string, jobId: string): string {
  return path.join(pacienteStorageDir(clinicaId, pacienteId), "jobs", sanitizeId(jobId));
}

export function hotFolderDir(clinicaId: number, adapterId: string): string {
  return path.join(STORAGE_ROOT, String(clinicaId), "cam-hot", sanitizeId(adapterId));
}

/** Impede path traversal em IDs usados em filesystem. */
export function sanitizeId(id: string): string {
  const s = String(id)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\./g, "_");
  if (!s || s === "." || s === "..") throw new Error("ID inválido para storage");
  return s;
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()\[\]]+/g, "_").trim();
  if (!base) throw new Error("Nome de arquivo inválido");
  return base.slice(0, 180);
}
