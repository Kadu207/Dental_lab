import { describe, expect, it } from "vitest";
import { canAccess, parsePermissoes, DEFAULT_POLICIES } from "./rbac.js";

describe("RBAC", () => {
  it("estagiario cannot delete clientes", () => {
    const perms = parsePermissoes(null, "estagiario");
    expect(canAccess(perms, "clientes", "delete")).toBe(false);
  });

  it("estagiario can read clientes", () => {
    const perms = parsePermissoes(null, "estagiario");
    expect(canAccess(perms, "clientes", "read")).toBe(true);
  });

  it("admin has wildcard access", () => {
    const perms = parsePermissoes(null, "admin");
    expect(canAccess(perms, "clientes", "delete")).toBe(true);
    expect(canAccess(perms, "financeiro", "write")).toBe(true);
  });

  it("gestor can write financeiro", () => {
    const perms = parsePermissoes(null, "gestor");
    expect(canAccess(perms, "financeiro", "write")).toBe(true);
  });

  it("laboratorio cannot delete estoque", () => {
    const perms = parsePermissoes(null, "laboratorio");
    expect(canAccess(perms, "estoque", "delete")).toBe(false);
    expect(canAccess(perms, "estoque", "write")).toBe(true);
  });

  it("uses custom permissoes JSON when provided", () => {
    const custom = [{ resource: "clientes", actions: ["read"] as ("read" | "write" | "delete")[] }];
    const perms = parsePermissoes(JSON.stringify(custom), "admin");
    expect(canAccess(perms, "clientes", "read")).toBe(true);
    expect(canAccess(perms, "clientes", "write")).toBe(false);
  });

  it("DEFAULT_POLICIES covers all perfis", () => {
    for (const perfil of Object.keys(DEFAULT_POLICIES)) {
      expect(parsePermissoes(null, perfil).length).toBeGreaterThan(0);
    }
  });
});
