import { describe, expect, it } from "vitest";
import {
  DEV_JWT_SECRET_FALLBACK,
  isCorsOriginAllowed,
  resolveCorsOrigins,
  resolveJwtSecret,
  resolvePasswordResetExposeToken,
  resolveSeedPassword,
} from "./config.js";

describe("resolveJwtSecret", () => {
  it("produção + secret curto → throw", () => {
    expect(() =>
      resolveJwtSecret({ DENTAL_LAB_JWT_SECRET: "secret-curto" }, "production"),
    ).toThrow(/32 caracteres/);
  });

  it("produção + fallback de dev → throw", () => {
    expect(() =>
      resolveJwtSecret({ DENTAL_LAB_JWT_SECRET: DEV_JWT_SECRET_FALLBACK }, "production"),
    ).toThrow(/padrão de desenvolvimento/);
  });

  it("test/dev + vazio → fallback", () => {
    expect(resolveJwtSecret({}, "test")).toBe(DEV_JWT_SECRET_FALLBACK);
    expect(resolveJwtSecret({}, "development")).toBe(DEV_JWT_SECRET_FALLBACK);
  });
});

describe("resolvePasswordResetExposeToken", () => {
  it("expose token default false", () => {
    expect(resolvePasswordResetExposeToken({})).toBe(false);
    expect(resolvePasswordResetExposeToken({ DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN: "" })).toBe(
      false,
    );
  });

  it("só true se a env for explícita", () => {
    expect(resolvePasswordResetExposeToken({ DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN: "true" })).toBe(
      true,
    );
  });
});

describe("resolveSeedPassword", () => {
  it("produção + admin123 → throw", () => {
    expect(() =>
      resolveSeedPassword(
        { DENTAL_LAB_BOOTSTRAP_ADMIN_PASSWORD: "admin123" },
        "DENTAL_LAB_BOOTSTRAP_ADMIN_PASSWORD",
        "admin123",
        "production",
      ),
    ).toThrow(/obrigatório em produção/);
  });

  it("fora de produção usa default", () => {
    expect(
      resolveSeedPassword({}, "DENTAL_LAB_BOOTSTRAP_ADMIN_PASSWORD", "admin123", "test"),
    ).toBe("admin123");
  });
});

describe("resolveCorsOrigins", () => {
  it("produção + lista vazia → throw", () => {
    expect(() => resolveCorsOrigins({}, "production")).toThrow(/obrigatório em produção/);
    expect(() => resolveCorsOrigins({ DENTAL_LAB_CORS_ORIGINS: "  " }, "production")).toThrow(
      /obrigatório em produção/,
    );
  });

  it("produção + * → throw", () => {
    expect(() => resolveCorsOrigins({ DENTAL_LAB_CORS_ORIGINS: "*" }, "production")).toThrow(
      /não pode usar/,
    );
    expect(() =>
      resolveCorsOrigins(
        { DENTAL_LAB_CORS_ORIGINS: "https://dentallab.inovatitech.com.br,*.inovatitech.com.br" },
        "production",
      ),
    ).toThrow(/não pode usar/);
  });

  it("produção com origens explícitas (domínio real)", () => {
    expect(
      resolveCorsOrigins(
        { DENTAL_LAB_CORS_ORIGINS: "https://dentallab.inovatitech.com.br/, http://localhost:5173" },
        "production",
      ),
    ).toEqual(["https://dentallab.inovatitech.com.br", "http://localhost:5173"]);
  });

  it("dev aceita lista vazia", () => {
    expect(resolveCorsOrigins({}, "development")).toEqual([]);
  });
});

describe("isCorsOriginAllowed", () => {
  const prod = "https://dentallab.inovatitech.com.br";
  const allowed = [prod];

  it("sem Origin permite (curl/health)", () => {
    expect(isCorsOriginAllowed(undefined, allowed, "production")).toBe(true);
  });

  it("origem de produção na allowlist", () => {
    expect(isCorsOriginAllowed(prod, allowed, "production")).toBe(true);
    expect(isCorsOriginAllowed(`${prod}/`, allowed, "production")).toBe(true);
  });

  it("http e host diferente são bloqueados", () => {
    expect(isCorsOriginAllowed("http://dentallab.inovatitech.com.br", allowed, "production")).toBe(
      false,
    );
    expect(isCorsOriginAllowed("https://evil.example", allowed, "production")).toBe(false);
  });

  it("Origin null é bloqueado", () => {
    expect(isCorsOriginAllowed("null", allowed, "production")).toBe(false);
  });

  it("lista vazia só libera fora de produção", () => {
    expect(isCorsOriginAllowed(prod, [], "development")).toBe(true);
    expect(isCorsOriginAllowed(prod, [], "production")).toBe(false);
  });
});
