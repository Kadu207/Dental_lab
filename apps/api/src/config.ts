/**
 * Configuração central — licença, CORS, banco e auth.
 * Ver `apps/api/.env.example`.
 */

export type LabDeploymentMode = "standalone" | "embedded";
export type DbDriver = "sqlite" | "postgres";

export const DEV_JWT_SECRET_FALLBACK = "dev-lab-jwt-change-in-production";

const ENV_TRUE = ["1", "true", "yes", "on"];

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === "") return defaultValue;
  return ENV_TRUE.includes(v);
}

export function isProductionRuntime(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "production";
}

export function resolveJwtSecret(
  env: NodeJS.ProcessEnv,
  nodeEnv: string | undefined,
): string {
  const secret = env.DENTAL_LAB_JWT_SECRET?.trim() || env.SECRET_KEY?.trim() || "";
  if (isProductionRuntime(nodeEnv)) {
    if (!secret) {
      throw new Error("DENTAL_LAB_JWT_SECRET (ou SECRET_KEY) é obrigatório em produção.");
    }
    if (secret.length < 32) {
      throw new Error("DENTAL_LAB_JWT_SECRET deve ter no mínimo 32 caracteres em produção.");
    }
    if (secret === DEV_JWT_SECRET_FALLBACK) {
      throw new Error(
        "DENTAL_LAB_JWT_SECRET não pode usar o valor padrão de desenvolvimento em produção.",
      );
    }
    return secret;
  }
  return secret || DEV_JWT_SECRET_FALLBACK;
}

export function resolveSeedPassword(
  env: NodeJS.ProcessEnv,
  envName: string,
  defaultValue: string,
  nodeEnv: string | undefined,
): string {
  const value = env[envName]?.trim() || "";
  if (isProductionRuntime(nodeEnv)) {
    if (!value || value === defaultValue) {
      throw new Error(
        `${envName} é obrigatório em produção e não pode ser a senha padrão de desenvolvimento.`,
      );
    }
    return value;
  }
  return value || defaultValue;
}

export function resolvePasswordResetExposeToken(env: NodeJS.ProcessEnv): boolean {
  const v = env.DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN?.trim().toLowerCase();
  if (v === undefined || v === "") return false;
  return ENV_TRUE.includes(v);
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function resolveCorsOrigins(env: NodeJS.ProcessEnv, nodeEnv: string | undefined): string[] {
  const origins = parseCorsOrigins(env.DENTAL_LAB_CORS_ORIGINS);
  if (isProductionRuntime(nodeEnv)) {
    if (origins.length === 0) {
      throw new Error(
        "DENTAL_LAB_CORS_ORIGINS é obrigatório em produção (lista de origens, sem vazio).",
      );
    }
    if (origins.some((o) => o === "*" || o.includes("*"))) {
      throw new Error("DENTAL_LAB_CORS_ORIGINS não pode usar '*' em produção.");
    }
  }
  return origins;
}

/** Sem header Origin (curl/health): permite. `Origin: null` e lista vazia em produção: bloqueia. */
export function isCorsOriginAllowed(
  origin: string | undefined,
  allowed: string[],
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (origin === undefined || origin === "") return true;
  if (origin === "null") return false;
  const normalized = origin.replace(/\/$/, "");
  if (allowed.includes(normalized)) return true;
  if (allowed.length === 0 && !isProductionRuntime(nodeEnv)) return true;
  return false;
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

export const CORS_ORIGINS = resolveCorsOrigins(process.env, process.env.NODE_ENV);

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
export const JWT_SECRET = resolveJwtSecret(process.env, process.env.NODE_ENV);

/** Mesmo SECRET_KEY do Excellence — valida token do ERP em modo embedded */
export const ERP_JWT_SECRET =
  process.env.DENTAL_LAB_ERP_JWT_SECRET?.trim() || process.env.SECRET_KEY?.trim() || JWT_SECRET;

export const JWT_TTL_MINUTES = Number(process.env.DENTAL_LAB_JWT_TTL_MINUTES ?? "480");

export const POSTGRES_SCHEMA = envString("DENTAL_LAB_POSTGRES_SCHEMA", "dental_lab");

/** Registry multi-tenant (tenants + platform_usuarios) */
export const PLATFORM_SCHEMA = envString("DENTAL_LAB_PLATFORM_SCHEMA", "dental_lab_platform");

export const SUPERVISOR_SEED_PASSWORD = resolveSeedPassword(
  process.env,
  "DENTAL_LAB_SUPERVISOR_PASSWORD",
  "supervisor123",
  process.env.NODE_ENV,
);

/** Admin de plataforma (integrações) — acesso /supervisor com perfil admin */
export const PLATFORM_ADMIN_SEED_PASSWORD = resolveSeedPassword(
  process.env,
  "DENTAL_LAB_PLATFORM_ADMIN_PASSWORD",
  "admin123",
  process.env.NODE_ENV,
);

/** Senha do usuário admin bootstrap (standalone, lab_usuarios) */
export const BOOTSTRAP_ADMIN_PASSWORD = resolveSeedPassword(
  process.env,
  "DENTAL_LAB_BOOTSTRAP_ADMIN_PASSWORD",
  "admin123",
  process.env.NODE_ENV,
);

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

/** Só expõe resetToken na API se a env estiver explicitamente true */
export const PASSWORD_RESET_EXPOSE_TOKEN = resolvePasswordResetExposeToken(process.env);

/** Integrações N8N / Chatwoot (Onda 3 — spec 012) */
export const INTEGRATIONS_ENABLED = envBool("INTEGRATIONS_ENABLED", false);
/** Em embedded, CRM fica no Excellence; só emite se flag explícita */
export const INTEGRATIONS_FORCE_IN_EMBEDDED = envBool("INTEGRATIONS_FORCE_IN_EMBEDDED", false);
export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL?.trim() ?? "";
export const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET?.trim() ?? "";
export const CHATWOOT_WEBHOOK_URL = process.env.CHATWOOT_WEBHOOK_URL?.trim() ?? "";
export const CHATWOOT_WEBHOOK_SECRET = process.env.CHATWOOT_WEBHOOK_SECRET?.trim() ?? "";
