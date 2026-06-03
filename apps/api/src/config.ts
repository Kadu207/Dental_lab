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

/** Registry multi-tenant (tenants + platform_usuarios) */
export const PLATFORM_SCHEMA = envString("DENTAL_LAB_PLATFORM_SCHEMA", "dental_lab_platform");

export const SUPERVISOR_SEED_PASSWORD =
  process.env.DENTAL_LAB_SUPERVISOR_PASSWORD?.trim() || "supervisor123";

/** URL pública do frontend (links de recuperação de senha) */
export const APP_PUBLIC_URL = envString(
  "DENTAL_LAB_APP_URL",
  "http://localhost:9180",
);

/** SMTP — recuperação de senha por e-mail */
export const SMTP_ENABLED = envBool("DENTAL_LAB_SMTP_ENABLED", false);
export const SMTP_HOST = process.env.DENTAL_LAB_SMTP_HOST?.trim() ?? "";
export const SMTP_PORT = Number(process.env.DENTAL_LAB_SMTP_PORT ?? "587");
export const SMTP_SECURE = envBool("DENTAL_LAB_SMTP_SECURE", false);
export const SMTP_USER = process.env.DENTAL_LAB_SMTP_USER?.trim() ?? "";
export const SMTP_PASS = process.env.DENTAL_LAB_SMTP_PASS?.trim() ?? "";
export const SMTP_FROM =
  process.env.DENTAL_LAB_SMTP_FROM?.trim() || "Dental Lab <noreply@dentallab.local>";

/** Em dev, expõe resetToken na API quando SMTP não está configurado */
export const PASSWORD_RESET_EXPOSE_TOKEN = envBool(
  "DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN",
  !SMTP_ENABLED,
);
