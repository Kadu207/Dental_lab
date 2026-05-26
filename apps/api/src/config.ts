/**
 * Configuração central — licença, CORS, banco e auth.
 * Ver `apps/api/.env.example`.
 */

export type LabDeploymentMode = "standalone" | "embedded";
export type DbDriver = "sqlite" | "postgres";

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(v);
}

function envString(name: string, defaultValue: string): string {
  return process.env[name]?.trim() ?? defaultValue;
}

export const DEPLOYMENT_MODE = envString("DENTAL_LAB_DEPLOYMENT_MODE", "standalone") as LabDeploymentMode;

export const LICENSE_REQUIRED = envBool("DENTAL_LAB_LICENSE_REQUIRED", false);
export const LICENSE_KEY = process.env.DENTAL_LAB_LICENSE_KEY?.trim() ?? "";
export const LICENSE_SERVER_URL = process.env.DENTAL_LAB_LICENSE_SERVER_URL?.trim().replace(/\/$/, "") ?? "";
export const LICENSE_SERVER_API_KEY = process.env.DENTAL_LAB_LICENSE_SERVER_API_KEY?.trim() ?? "";
export const TRIAL_DAYS = Number(process.env.DENTAL_LAB_TRIAL_DAYS ?? "30");

export const CORS_ORIGINS =
  process.env.DENTAL_LAB_CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

export const PORT = Number(process.env.PORT ?? "3333");
export const SQLITE_PATH = process.env.DENTAL_LAB_SQLITE_PATH?.trim();

/** sqlite (dev legado) | postgres (standalone ou embedded fase 2) */
export const DB_DRIVER: DbDriver =
  envString("DENTAL_LAB_DB_DRIVER", DEPLOYMENT_MODE === "embedded" ? "postgres" : "sqlite") === "postgres"
    ? "postgres"
    : "sqlite";

/** Postgres do módulo (standalone: DB dedicado; embedded: mesmo cluster, schema dental_lab) */
export const DATABASE_URL = process.env.DENTAL_LAB_DATABASE_URL?.trim() ?? "";

/**
 * Postgres do ERP (embedded): validação de usuário na tabela `usuario`.
 * Se vazio em embedded, usa DATABASE_URL.
 */
export const ERP_DATABASE_URL = process.env.DENTAL_LAB_ERP_DATABASE_URL?.trim() ?? "";

export const AUTH_REQUIRED = envBool("DENTAL_LAB_AUTH_REQUIRED", true);

/** JWT do módulo standalone (usuários lab_usuarios) */
export const JWT_SECRET =
  process.env.DENTAL_LAB_JWT_SECRET?.trim() ||
  process.env.SECRET_KEY?.trim() ||
  "dev-lab-jwt-change-in-production";

/** Mesmo SECRET_KEY do Excellence — valida token do ERP em modo embedded */
export const ERP_JWT_SECRET =
  process.env.DENTAL_LAB_ERP_JWT_SECRET?.trim() || process.env.SECRET_KEY?.trim() || JWT_SECRET;

export const JWT_TTL_MINUTES = Number(process.env.DENTAL_LAB_JWT_TTL_MINUTES ?? "480");

export const POSTGRES_SCHEMA = envString("DENTAL_LAB_POSTGRES_SCHEMA", "dental_lab");
