import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { buildClienteSearch } from "./cliente-search.js";
import { applySqliteClienteFullText } from "./fts-schema.js";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE clientes (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      cpf TEXT,
      telefone TEXT,
      email TEXT
    );
  `);
  applySqliteClienteFullText(db);
  return db;
}

function insert(
  db: Database.Database,
  row: { id: string; clinicaId: number; nome: string; cpf?: string; telefone?: string; email?: string },
) {
  db.prepare(
    "INSERT INTO clientes (id, clinica_id, nome, cpf, telefone, email) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(row.id, row.clinicaId, row.nome, row.cpf ?? null, row.telefone ?? null, row.email ?? null);
}

function search(db: Database.Database, clinicaId: number, q: string): string[] {
  const filter = buildClienteSearch("sqlite", q);
  const params: unknown[] = [clinicaId];
  let sql = "SELECT id FROM clientes WHERE clinica_id = ?";
  if (filter) {
    sql += filter.sql;
    params.push(...filter.params);
  }
  sql += " ORDER BY id";
  const rows = db.prepare(sql).all(...params) as { id: string }[];
  return rows.map((row) => row.id);
}

describe("full-text SQLite de pacientes", () => {
  it("encontra por nome, acento, CPF, telefone e não vaza outro tenant", () => {
    const db = createDb();
    insert(db, {
      id: "p1",
      clinicaId: 1,
      nome: "Maria da Silva",
      cpf: "123.456.789-09",
      telefone: "(11) 98888-7777",
      email: "maria@lab.com",
    });
    insert(db, { id: "p2", clinicaId: 1, nome: "João Souza" });
    insert(db, { id: "p3", clinicaId: 2, nome: "Maria Outra" });
    insert(db, { id: "p4", clinicaId: 1, nome: "Ana" });
    insert(db, { id: "p5", clinicaId: 1, nome: "100% emax" });

    expect(search(db, 1, "maria")).toEqual(["p1"]);
    expect(search(db, 1, "silva")).toEqual(["p1"]);
    expect(search(db, 1, "maria silva")).toEqual(["p1"]);
    expect(search(db, 1, "aria")).toEqual(["p1"]);
    expect(search(db, 1, "joao")).toEqual(["p2"]);
    expect(search(db, 1, "João")).toEqual(["p2"]);
    expect(search(db, 1, "12345678909")).toEqual(["p1"]);
    expect(search(db, 1, "98888")).toEqual(["p1"]);
    expect(search(db, 1, "%")).toEqual(["p5"]);
    expect(search(db, 1, "_")).toEqual([]);
    expect(search(db, 2, "maria")).toEqual(["p3"]);
  });

  it("atualiza e remove o índice junto com o paciente", () => {
    const db = createDb();
    insert(db, { id: "p1", clinicaId: 1, nome: "Maria da Silva" });
    db.prepare("UPDATE clientes SET nome = ? WHERE id = ?").run("Carlos Mendes", "p1");
    expect(search(db, 1, "maria")).toEqual([]);
    expect(search(db, 1, "carlos")).toEqual(["p1"]);
    db.prepare("DELETE FROM clientes WHERE id = ?").run("p1");
    expect(search(db, 1, "carlos")).toEqual([]);
  });

  it("pode rodar a migração de novo sem perder a busca", () => {
    const db = createDb();
    insert(db, { id: "p1", clinicaId: 1, nome: "Maria da Silva" });
    applySqliteClienteFullText(db);
    expect(search(db, 1, "maria")).toEqual(["p1"]);
  });
});
