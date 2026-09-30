import type Database from "better-sqlite3";
import { ACCENT_FROM, ACCENT_TO } from "./cliente-search.js";

const PHONE_CHARS = ["(", ")", "-", " ", ".", "+", "/"] as const;

export function assertSqlIdent(name: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error("Identificador SQL inválido");
  }
  return name;
}

function sqliteFoldExpr(columnExpr: string): string {
  let expr = `lower(${columnExpr})`;
  for (let i = 0; i < ACCENT_FROM.length; i++) {
    const from = ACCENT_FROM[i]!.replace(/'/g, "''");
    const to = ACCENT_TO[i]!.replace(/'/g, "''");
    expr = `replace(${expr}, '${from}', '${to}')`;
  }
  return expr;
}

function sqliteDigitsExpr(columnSql: string): string {
  let expr = `coalesce(${columnSql}, '')`;
  for (const ch of PHONE_CHARS) {
    expr = `replace(${expr}, '${ch}', '')`;
  }
  return expr;
}

export function sqliteBuscaTextoExpr(alias: "new" | ""): string {
  const col = (name: string) => (alias ? `${alias}.${name}` : name);
  return [
    sqliteFoldExpr(`coalesce(${col("nome")}, '')`),
    `lower(coalesce(${col("cpf")}, ''))`,
    sqliteDigitsExpr(col("cpf")),
    `lower(coalesce(${col("telefone")}, ''))`,
    sqliteDigitsExpr(col("telefone")),
    sqliteFoldExpr(`coalesce(${col("email")}, '')`),
  ].join(" || ' ' || ");
}

function postgresFoldExpr(columnExpr: string): string {
  return `translate(lower(${columnExpr}), '${ACCENT_FROM}', '${ACCENT_TO}')`;
}

export function postgresBuscaTextoExpr(): string {
  return [
    postgresFoldExpr("coalesce(nome, '')"),
    "lower(coalesce(cpf, ''))",
    "regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g')",
    "lower(coalesce(telefone, ''))",
    "regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g')",
    postgresFoldExpr("coalesce(email, '')"),
  ].join(" || ' ' || ");
}

export function postgresClienteFullTextStatements(schema: string): string[] {
  const ident = assertSqlIdent(schema);
  const busca = postgresBuscaTextoExpr();
  return [
    `ALTER TABLE ${ident}.clientes ADD COLUMN IF NOT EXISTS busca_texto TEXT
       GENERATED ALWAYS AS (${busca}) STORED`,
    `ALTER TABLE ${ident}.clientes ADD COLUMN IF NOT EXISTS search_vector tsvector
       GENERATED ALWAYS AS (to_tsvector('simple', ${busca})) STORED`,
    `CREATE INDEX IF NOT EXISTS idx_lab_clientes_search ON ${ident}.clientes USING GIN (search_vector)`,
  ];
}

export async function applyPostgresClienteFullText(
  db: { query: (sql: string) => Promise<unknown> },
  schema: string,
): Promise<void> {
  for (const sql of postgresClienteFullTextStatements(schema)) {
    await db.query(sql);
  }
}

export function applySqliteClienteFullText(db: Database.Database): void {
  try {
    db.exec("ALTER TABLE clientes ADD COLUMN busca_texto TEXT");
  } catch {
    /* coluna já existe */
  }

  const blob = sqliteBuscaTextoExpr("");
  const blobNew = sqliteBuscaTextoExpr("new");

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS clientes_fts USING fts5(
      busca_texto,
      content='clientes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );

    DROP TRIGGER IF EXISTS clientes_busca_ai;
    DROP TRIGGER IF EXISTS clientes_busca_au;
    DROP TRIGGER IF EXISTS clientes_fts_ad;

    CREATE TRIGGER clientes_busca_ai AFTER INSERT ON clientes BEGIN
      UPDATE clientes SET busca_texto = ${blobNew} WHERE rowid = new.rowid;
      INSERT INTO clientes_fts(rowid, busca_texto) VALUES (new.rowid, ${blobNew});
    END;

    CREATE TRIGGER clientes_busca_au AFTER UPDATE OF nome, cpf, telefone, email ON clientes BEGIN
      UPDATE clientes SET busca_texto = ${blobNew} WHERE rowid = new.rowid;
      INSERT INTO clientes_fts(clientes_fts, rowid, busca_texto) VALUES ('delete', old.rowid, old.busca_texto);
      INSERT INTO clientes_fts(rowid, busca_texto) VALUES (new.rowid, ${blobNew});
    END;

    CREATE TRIGGER clientes_fts_ad AFTER DELETE ON clientes BEGIN
      INSERT INTO clientes_fts(clientes_fts, rowid, busca_texto) VALUES ('delete', old.rowid, old.busca_texto);
    END;
  `);

  db.prepare(`UPDATE clientes SET busca_texto = ${blob} WHERE coalesce(busca_texto, '') != (${blob})`).run();
  db.exec(`INSERT INTO clientes_fts(clientes_fts) VALUES ('rebuild')`);
}

export function postgresIdempotencyStatements(schema: string): string[] {
  const ident = assertSqlIdent(schema);
  return [
    `CREATE TABLE IF NOT EXISTS ${ident}.integration_events (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      direction TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (direction, channel, idempotency_key)
    )`,
  ];
}

export async function applyPostgresIdempotencyStore(
  db: { query: (sql: string) => Promise<unknown> },
  schema: string,
): Promise<void> {
  for (const sql of postgresIdempotencyStatements(schema)) {
    await db.query(sql);
  }
}

export function applySqliteIdempotencyStore(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_events (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      direction TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (direction, channel, idempotency_key)
    );
  `);
}
