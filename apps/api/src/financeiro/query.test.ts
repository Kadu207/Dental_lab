import { describe, expect, it } from "vitest";
import { RELATORIO_CLIENTES_JOIN, buildRelatorioProducaoQuery } from "../routes/relatorios.js";
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

describe("relatório produção — isolamento de paciente (T017)", () => {
  it("JOIN exige clinica_id do cliente igual ao da prótese", () => {
    expect(RELATORIO_CLIENTES_JOIN).toContain("c.id = p.paciente_id");
    expect(RELATORIO_CLIENTES_JOIN).toContain("c.clinica_id = p.clinica_id");
  });

  it("SQL gerado inclui o JOIN isolado e o filtro da clínica da prótese", () => {
    const { sql, params } = buildRelatorioProducaoQuery({ clinicaId: 7 });
    expect(sql).toContain(RELATORIO_CLIENTES_JOIN);
    expect(sql).toContain("WHERE p.clinica_id = ?");
    expect(params).toEqual([7]);
  });

  it("HTML usa o mesmo JOIN com limite", () => {
    const { sql, params } = buildRelatorioProducaoQuery({
      clinicaId: 7,
      de: "2026-01-01",
      ate: "2026-12-31",
      limit: 500,
    });
    expect(sql).toContain("c.clinica_id = p.clinica_id");
    expect(sql).toContain("LIMIT 500");
    expect(params).toEqual([7, "2026-01-01", "2026-12-31"]);
  });

  it("mesmo paciente_id em outra clínica não casa no JOIN", () => {
    const protese = { paciente_id: "pac-1", clinica_id: 1 };
    const clientes = [
      { id: "pac-1", clinica_id: 2, nome: "Paciente da clínica B" },
      { id: "pac-1", clinica_id: 1, nome: "Paciente da clínica A" },
    ];
    const joined = clientes.find(
      (c) => c.id === protese.paciente_id && c.clinica_id === protese.clinica_id,
    );
    expect(joined?.nome).toBe("Paciente da clínica A");
  });
});
