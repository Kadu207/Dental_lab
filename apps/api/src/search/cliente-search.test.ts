import { describe, expect, it } from "vitest";
import { ACCENT_FROM, ACCENT_TO, buildClienteSearch, foldSearchText, tokenizeSearch } from "./cliente-search.js";
import { postgresClienteFullTextStatements } from "./fts-schema.js";

describe("busca de pacientes", () => {
  it("mantém o mapa de acentos alinhado", () => {
    expect(ACCENT_FROM.length).toBe(ACCENT_TO.length);
    expect(foldSearchText("João José")).toBe("joao jose");
  });

  it("não interpola o termo do usuário no SQL", () => {
    const raw = "%' OR 1=1; DROP TABLE clientes;--";
    const pg = buildClienteSearch("postgres", raw);
    const sqlite = buildClienteSearch("sqlite", raw);
    expect(pg?.sql.toLowerCase()).not.toContain("like");
    expect(sqlite?.sql.toLowerCase()).not.toContain("like");
    expect(pg?.sql).not.toContain(raw);
    expect(sqlite?.sql).not.toContain(raw);
    expect(pg?.sql).toContain("to_tsquery");
    expect(pg?.sql).toContain("strpos");
    expect(sqlite?.sql).toContain("clientes_fts MATCH");
    expect(sqlite?.sql).toContain("instr");
    expect(tokenizeSearch(foldSearchText(raw))).not.toContain("%");
  });

  it("trata % e _ como texto, sem casar tudo", () => {
    const percent = buildClienteSearch("postgres", "%");
    expect(percent?.sql).toBe(" AND strpos(busca_texto, ?) > 0");
    expect(percent?.params).toEqual(["%"]);
    expect(percent?.sql).not.toContain("LIKE");

    const underscore = buildClienteSearch("sqlite", "_");
    expect(underscore?.params).toEqual(["_"]);
  });

  it("monta prefixo seguro para o full-text", () => {
    const filter = buildClienteSearch("postgres", "Maria Silva");
    expect(filter?.params[0]).toBe("maria:* & silva:*");
    expect(filter?.params[1]).toBe("maria silva");
  });

  it("ignora busca vazia", () => {
    expect(buildClienteSearch("sqlite", "   ")).toBeNull();
  });
});

describe("DDL de full-text no Postgres", () => {
  it("cria tsvector, índice GIN e não usa LIKE", () => {
    const sql = postgresClienteFullTextStatements("dental_lab").join("\n");
    expect(sql).toContain("to_tsvector('simple'");
    expect(sql).toContain("USING GIN (search_vector)");
    expect(sql).toContain("GENERATED ALWAYS AS");
    expect(sql.toLowerCase()).not.toContain("like");
  });

  it("recusa identificador de schema inseguro", () => {
    expect(() => postgresClienteFullTextStatements("dental_lab;drop")).toThrow(/inválido/i);
  });
});
