import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import type { Request } from "express";
import type { AuthContext } from "../auth/types.js";
import {
  DEV_JWT_SECRET_FALLBACK,
  resolveJwtSecret,
  resolvePasswordResetExposeToken,
  resolveSeedPassword,
} from "../config.js";
import { listLicenses } from "../licensing/service.js";
import {
  canManageLicencas,
  resolveGenerateClinicaId,
  resolveLicencaStatusClinicaId,
  resolveListLicensesOpts,
} from "../routes/licencas.js";
import { resolveLicenseClinicaId } from "./license.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

function isWriteExempt(path: string, method: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  if (path === "/api/licencas/ativar" || path.startsWith("/api/licencas/ativar/")) return true;
  return false;
}

function req(partial: { auth?: AuthContext; headers?: Record<string, string> }): Request {
  return { auth: partial.auth, headers: partial.headers ?? {} } as Request;
}

function auth(partial: Partial<AuthContext> & Pick<AuthContext, "clinicaId" | "perfil">): AuthContext {
  return {
    mode: "standalone",
    userId: "u1",
    sub: "u1",
    isPlatformUser: false,
    ...partial,
  };
}

describe("license write-guard helpers", () => {
  it("identifica métodos de escrita", () => {
    expect(isWriteMethod("POST")).toBe(true);
    expect(isWriteMethod("put")).toBe(true);
    expect(isWriteMethod("GET")).toBe(false);
    expect(isWriteMethod("HEAD")).toBe(false);
  });

  it("libera ativação de licença mesmo expirada", () => {
    expect(isWriteExempt("/api/licencas/ativar", "POST")).toBe(true);
    expect(isWriteExempt("/api/licencas/ativar/", "POST")).toBe(true);
    expect(isWriteExempt("/api/licencas/gerar", "POST")).toBe(false);
    expect(isWriteExempt("/api/proteses", "POST")).toBe(false);
  });
});

describe("resolveLicenseClinicaId", () => {
  it("plataforma com X-Clinica-Id válido usa o header", () => {
    expect(
      resolveLicenseClinicaId(
        req({
          auth: auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }),
          headers: { "x-clinica-id": "42" },
        }),
      ),
    ).toBe(42);
  });

  it("plataforma sem header e clinicaId 0 cai no fallback 1", () => {
    expect(
      resolveLicenseClinicaId(
        req({ auth: auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }) }),
      ),
    ).toBe(1);
  });

  it("tenant ignora X-Clinica-Id (anti-IDOR) e usa o token", () => {
    expect(
      resolveLicenseClinicaId(
        req({
          auth: auth({ clinicaId: 7, perfil: "admin" }),
          headers: { "x-clinica-id": "99" },
        }),
      ),
    ).toBe(7);
  });

  it("sem auth não confia no header e usa 1", () => {
    expect(resolveLicenseClinicaId(req({ headers: { "x-clinica-id": "99" } }))).toBe(1);
  });

  it("tenant sem header usa clinicaId do token", () => {
    expect(resolveLicenseClinicaId(req({ auth: auth({ clinicaId: 5, perfil: "gestor" }) }))).toBe(5);
  });
});

describe("secrets de produção", () => {
  it("produção rejeita JWT curto ou fallback de dev", () => {
    expect(() => resolveJwtSecret({}, "production")).toThrow(/obrigatório/);
    expect(() =>
      resolveJwtSecret({ DENTAL_LAB_JWT_SECRET: DEV_JWT_SECRET_FALLBACK }, "production"),
    ).toThrow(/padrão/);
    expect(() => resolveJwtSecret({ DENTAL_LAB_JWT_SECRET: "curto" }, "production")).toThrow(/32/);
  });

  it("dev usa fallback", () => {
    expect(resolveJwtSecret({}, "test")).toBe(DEV_JWT_SECRET_FALLBACK);
  });

  it("reset token default false", () => {
    expect(resolvePasswordResetExposeToken({})).toBe(false);
    expect(resolvePasswordResetExposeToken({ DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN: "true" })).toBe(true);
  });

  it("produção rejeita senha seed padrão", () => {
    expect(() =>
      resolveSeedPassword({}, "DENTAL_LAB_SUPERVISOR_PASSWORD", "supervisor123", "production"),
    ).toThrow();
  });
});

describe("schema Postgres RLS", () => {
  it("habilita FORCE RLS nas tabelas tenant", () => {
    const sqlPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "schema-postgres.sql");
    const sql = readFileSync(sqlPath, "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("tenant_clinica_isolation");
    expect(sql).toContain("app.clinica_id");
  });
});

describe("GET /licencas/status — clinicaId", () => {
  it("sem auth lança AUTH_REQUIRED", () => {
    try {
      resolveLicencaStatusClinicaId(req({}));
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(e).toMatchObject({ message: "Não autenticado", code: "AUTH_REQUIRED", statusCode: 401 });
    }
  });

  it("tenant usa clinicaId do token e ignora X-Clinica-Id", () => {
    expect(
      resolveLicencaStatusClinicaId(
        req({
          auth: auth({ clinicaId: 7, perfil: "admin" }),
          headers: { "x-clinica-id": "99" },
        }),
      ),
    ).toBe(7);
  });

  it("plataforma usa X-Clinica-Id via getClinicaId", () => {
    expect(
      resolveLicencaStatusClinicaId(
        req({
          auth: auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }),
          headers: { "x-clinica-id": "12" },
        }),
      ),
    ).toBe(12);
  });
});

describe("GET /licencas — listLicenses por tenant", () => {
  it("plataforma lista todos os tenants", () => {
    expect(resolveListLicensesOpts(auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }))).toEqual({
      allTenants: true,
    });
  });

  it("admin/gestor filtra pela clínica do token", () => {
    expect(resolveListLicensesOpts(auth({ clinicaId: 7, perfil: "admin" }))).toEqual({ clinicaId: 7 });
    expect(resolveListLicensesOpts(auth({ clinicaId: 3, perfil: "gestor" }))).toEqual({ clinicaId: 3 });
  });

  it("recepção não gerencia licenças", () => {
    expect(canManageLicencas(auth({ clinicaId: 7, perfil: "recepcao" }))).toBe(false);
    expect(canManageLicencas(undefined)).toBe(false);
    expect(canManageLicencas(auth({ clinicaId: 7, perfil: "admin" }))).toBe(true);
    expect(canManageLicencas(auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }))).toBe(true);
  });

  it("listLicenses sem clinicaId retorna vazio (não vaza outros tenants)", async () => {
    expect(await listLicenses()).toEqual([]);
    expect(await listLicenses({})).toEqual([]);
    expect(await listLicenses({ clinicaId: null })).toEqual([]);
  });
});

describe("POST /licencas/gerar — amarra clínica do ator", () => {
  it("tenant ignora clinica_id do body de outra clínica", () => {
    expect(resolveGenerateClinicaId(auth({ clinicaId: 7, perfil: "admin" }), 99)).toBe(7);
  });

  it("plataforma pode usar clinica_id do body", () => {
    expect(
      resolveGenerateClinicaId(auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }), 99),
    ).toBe(99);
  });

  it("plataforma sem body deixa clinicaId nulo", () => {
    expect(
      resolveGenerateClinicaId(auth({ clinicaId: 0, perfil: "supervisor", isPlatformUser: true }), null),
    ).toBeNull();
  });
});
