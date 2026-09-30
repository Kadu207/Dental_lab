import { describe, expect, it } from "vitest";
import {
  canAccess,
  canManagePerfil,
  parsePermissoes,
  sanitizePermissoesPayload,
  DEFAULT_POLICIES,
  perfilRank,
} from "./rbac.js";

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

  it("supervisor has highest rank", () => {
    expect(perfilRank("supervisor")).toBeGreaterThan(perfilRank("admin"));
    expect(perfilRank("admin")).toBeGreaterThan(perfilRank("gestor"));
  });

  it("supervisor can manage admin but not another supervisor", () => {
    expect(canManagePerfil("supervisor", "admin")).toBe(true);
    expect(canManagePerfil("supervisor", "supervisor")).toBe(false);
  });

  it("admin cannot manage peer admin or supervisor", () => {
    expect(canManagePerfil("admin", "gestor")).toBe(true);
    expect(canManagePerfil("admin", "admin")).toBe(false);
    expect(canManagePerfil("admin", "supervisor")).toBe(false);
  });

  it("gestor cannot manage admin", () => {
    expect(canManagePerfil("gestor", "recepcao")).toBe(true);
    expect(canManagePerfil("gestor", "admin")).toBe(false);
  });

  it("supervisor has wildcard access", () => {
    const perms = parsePermissoes(null, "supervisor");
    expect(canAccess(perms, "clientes", "delete")).toBe(true);
  });
});

describe("sanitizePermissoesPayload", () => {
  it("rejeita resource *", () => {
    expect(() =>
      sanitizePermissoesPayload([{ resource: "*", actions: ["read"] }], "gestor"),
    ).toThrow(/resource "\*"/);
  });

  it("rejeita resource desconhecido", () => {
    expect(() =>
      sanitizePermissoesPayload([{ resource: "nao-existe", actions: ["read"] }], "gestor"),
    ).toThrow(/Recurso inválido/);
  });

  it("rejeita action extra", () => {
    expect(() =>
      sanitizePermissoesPayload([{ resource: "financeiro", actions: ["read", "admin"] }], "gestor"),
    ).toThrow(/Ação inválida/);
  });

  it("gestor não pode conceder config delete", () => {
    expect(() =>
      sanitizePermissoesPayload([{ resource: "config", actions: ["delete"] }], "gestor"),
    ).toThrow("Não é permitido conceder permissão que você não possui");
  });

  it("gestor pode conceder financeiro write", () => {
    const result = sanitizePermissoesPayload(
      [{ resource: "financeiro", actions: ["write"] }],
      "gestor",
    );
    expect(result).toEqual([{ resource: "financeiro", actions: ["write"] }]);
  });
});
