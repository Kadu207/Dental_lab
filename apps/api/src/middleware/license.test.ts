import { describe, expect, it } from "vitest";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

function isWriteExempt(path: string, method: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  if (path === "/api/licencas/ativar" || path.startsWith("/api/licencas/ativar/")) return true;
  return false;
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
