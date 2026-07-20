import { describe, expect, it } from "vitest";
import { buildFinanceiroFilters, summarizeFinanceiro } from "./query.js";

describe("financeiro filters", () => {
  it("monta filtros de período e status", () => {
    const f = buildFinanceiroFilters({
      status: "Pendente",
      de: "2026-01-01",
      ate: "2026-01-31",
      pacienteId: "abc",
    });
    expect(f.sql).toContain("data_vencimento >=");
    expect(f.sql).toContain("data_vencimento <=");
    expect(f.sql).toContain("paciente_id");
    expect(f.params).toEqual(["Pendente", "2026-01-01", "2026-01-31", "abc"]);
  });

  it("sem filtros extras retorna vazio", () => {
    expect(buildFinanceiroFilters({}).sql).toBe("");
  });
});

describe("financeiro resumo", () => {
  it("soma receitas e despesas ignorando cancelados", () => {
    const s = summarizeFinanceiro([
      { tipo: "Receita", valor: 100, status: "Recebido" },
      { tipo: "Entrada", valor: 50, status: "Pendente" },
      { tipo: "Despesa", valor: 30, status: "Pago" },
      { tipo: "Saída", valor: 10, status: "Cancelado" },
    ]);
    expect(s.receitas).toBe(150);
    expect(s.despesas).toBe(30);
    expect(s.saldo).toBe(120);
    expect(s.quantidade).toBe(3);
  });
});
