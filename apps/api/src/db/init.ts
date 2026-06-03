import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import {
  DATABASE_URL,
  DB_DRIVER,
  DEPLOYMENT_MODE,
  ERP_DATABASE_URL,
  PLATFORM_SCHEMA,
  POSTGRES_SCHEMA,
  SQLITE_PATH,
  SUPERVISOR_SEED_PASSWORD,
} from "../config.js";
import { ensurePlatformSupervisor } from "../auth/platform.js";
import { ensureDefaultTenantRegistry } from "../tenants/registry.js";
import { setPgPool, setSqliteDb } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sqlitePath(): string {
  return SQLITE_PATH && SQLITE_PATH.length > 0
    ? SQLITE_PATH
    : path.join(__dirname, "..", "..", "data", "dental.db");
}

function migrateSqliteClinicaId(db: Database.Database) {
  const tables = ["clientes", "fornecedores", "estoque", "proteses", "status_historico", "config"];
  for (const table of tables) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === "clinica_id")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN clinica_id INTEGER NOT NULL DEFAULT 1`);
    }
  }
  const hasUsers = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lab_usuarios'")
    .get();
  if (!hasUsers) {
    db.exec(`
      CREATE TABLE lab_usuarios (
        id TEXT PRIMARY KEY,
        clinica_id INTEGER NOT NULL DEFAULT 1,
        nome TEXT NOT NULL,
        email TEXT,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'admin',
        ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (clinica_id, nome)
      );
    `);
  }
}

function initSqliteSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_usuarios (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      email TEXT,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'admin',
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (clinica_id, nome)
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      cpf TEXT,
      telefone TEXT,
      email TEXT,
      endereco TEXT,
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT,
      cnpj TEXT,
      telefone TEXT,
      email TEXT,
      contato TEXT,
      endereco TEXT,
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estoque (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      codigo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'Geral',
      unidade TEXT NOT NULL DEFAULT 'un',
      quantidade REAL NOT NULL DEFAULT 0,
      quantidade_minima REAL NOT NULL DEFAULT 0,
      fornecedor_id TEXT REFERENCES fornecedores(id),
      preco_unitario REAL,
      localizacao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (clinica_id, codigo)
    );

    CREATE TABLE IF NOT EXISTS proteses (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      codigo TEXT NOT NULL,
      codigo_barras TEXT NOT NULL,
      paciente_id TEXT NOT NULL REFERENCES clientes(id),
      dentista_nome TEXT NOT NULL,
      dentista_cro TEXT,
      dentista_clinica TEXT,
      dentista_telefone TEXT,
      tipo_protese TEXT NOT NULL,
      dentes TEXT,
      cor TEXT,
      material TEXT,
      observacoes TEXT,
      data_entrada TEXT NOT NULL,
      data_prevista_entrega TEXT,
      status TEXT NOT NULL DEFAULT 'recebido',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (clinica_id, codigo),
      UNIQUE (clinica_id, codigo_barras)
    );

    CREATE TABLE IF NOT EXISTS status_historico (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      protese_id TEXT NOT NULL REFERENCES proteses(id),
      status TEXT NOT NULL,
      observacao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      clinica_id INTEGER NOT NULL DEFAULT 1,
      chave TEXT NOT NULL,
      valor TEXT NOT NULL,
      PRIMARY KEY (clinica_id, chave)
    );

    CREATE TABLE IF NOT EXISTS product_licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL UNIQUE,
      clinica_id INTEGER,
      unidade_id TEXT,
      produto TEXT NOT NULL DEFAULT 'lab',
      periodo TEXT NOT NULL DEFAULT 'trial',
      cliente_nome TEXT DEFAULT '',
      starts_at TEXT DEFAULT '',
      ends_at TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      activated_at TEXT,
      lab_secret TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS empresa (
      clinica_id INTEGER PRIMARY KEY,
      razao_social TEXT,
      nome_fantasia TEXT,
      cnpj TEXT,
      cpf TEXT,
      telefone TEXT,
      celular TEXT,
      email TEXT,
      rede_social TEXT,
      cep TEXT,
      endereco TEXT,
      numero TEXT,
      bairro TEXT,
      cidade TEXT,
      estado TEXT,
      nome_responsavel TEXT,
      contato_responsavel TEXT,
      trial_started_at TEXT,
      trial_ends_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS empresa_unidades (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      cep TEXT,
      endereco TEXT,
      numero TEXT,
      bairro TEXT,
      cidade TEXT,
      estado TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      trial_started_at TEXT,
      trial_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      data_vencimento TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      forma_pagamento TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS procedimentos (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      custo_estimado REAL NOT NULL DEFAULT 0,
      gera_comissao TEXT NOT NULL DEFAULT 'Não',
      comissao_perc REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (clinica_id, nome)
    );

    CREATE TABLE IF NOT EXISTS grupos_permissoes (
      id TEXT PRIMARY KEY,
      clinica_id INTEGER NOT NULL DEFAULT 1,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (clinica_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS odontograma (
      clinica_id INTEGER NOT NULL,
      paciente_id TEXT NOT NULL,
      dentes TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (clinica_id, paciente_id)
    );
  `);
  migrateSqliteClinicaId(db);
  for (const col of ["erp_paciente_id"]) {
    try {
      db.exec(`ALTER TABLE clientes ADD COLUMN ${col} TEXT`);
    } catch {
      /* existe */
    }
  }
  for (const col of ["setor"]) {
    try {
      db.exec(`ALTER TABLE proteses ADD COLUMN ${col} TEXT NOT NULL DEFAULT 'gesso'`);
    } catch {
      /* existe */
    }
  }
  for (const col of ["permissoes", "descricao"]) {
    try {
      db.exec(`ALTER TABLE lab_usuarios ADD COLUMN ${col} TEXT`);
    } catch {
      /* existe */
    }
  }
  for (const [table, col] of [
    ["product_licenses", "unidade_id"],
    ["empresa", "trial_started_at"],
    ["empresa", "trial_ends_at"],
    ["empresa_unidades", "trial_started_at"],
    ["empresa_unidades", "trial_ends_at"],
  ] as const) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`);
    } catch {
      /* existe */
    }
  }
}

async function initPostgres() {
  const url = DATABASE_URL;
  if (!url) {
    throw new Error("DENTAL_LAB_DATABASE_URL é obrigatório quando DENTAL_LAB_DB_DRIVER=postgres");
  }
  const pool = new pg.Pool({ connectionString: url });
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema-postgres.sql"), "utf8");
  await pool.query(schemaSql);
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.clientes ADD COLUMN IF NOT EXISTS erp_paciente_id TEXT`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_clientes_erp ON ${POSTGRES_SCHEMA}.clientes (clinica_id, erp_paciente_id) WHERE erp_paciente_id IS NOT NULL`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.proteses ADD COLUMN IF NOT EXISTS setor TEXT NOT NULL DEFAULT 'gesso'`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.lab_usuarios ADD COLUMN IF NOT EXISTS permissoes TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.lab_usuarios ADD COLUMN IF NOT EXISTS descricao TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.product_licenses ADD COLUMN IF NOT EXISTS unidade_id TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.empresa ADD COLUMN IF NOT EXISTS trial_started_at TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.empresa ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.empresa_unidades ADD COLUMN IF NOT EXISTS trial_started_at TEXT`,
  );
  await pool.query(
    `ALTER TABLE ${POSTGRES_SCHEMA}.empresa_unidades ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`,
  );

  const platformSql = fs.readFileSync(path.join(__dirname, "schema-platform.sql"), "utf8");
  await pool.query(platformSql.replace(/\bdental_lab_platform\b/g, PLATFORM_SCHEMA));
  await ensureDefaultTenantRegistry(pool);

  if (DEPLOYMENT_MODE === "standalone") {
    const adminCheck = await pool.query(
      `SELECT id FROM ${POSTGRES_SCHEMA}.lab_usuarios WHERE clinica_id = 1 AND nome = $1`,
      ["admin"],
    );
    if (adminCheck.rowCount === 0) {
      const { randomUUID } = await import("crypto");
      const hash = await bcrypt.hash("admin123", 10);
      await pool.query(
        `INSERT INTO ${POSTGRES_SCHEMA}.lab_usuarios (id, clinica_id, nome, email, senha_hash, perfil)
         VALUES ($1, 1, 'admin', 'admin@dentallab.local', $2, 'admin')`,
        [randomUUID(), hash],
      );
      console.warn("[dental-lab] Usuário inicial standalone: admin / admin123 — altere a senha em produção.");
    }
    await pool.query(
      `UPDATE ${POSTGRES_SCHEMA}.lab_usuarios SET email = 'admin@dentallab.local'
       WHERE clinica_id = 1 AND lower(nome) = 'admin' AND (email IS NULL OR email = '')`,
    );
    await ensurePlatformSupervisor(pool, SUPERVISOR_SEED_PASSWORD);
  }

  setPgPool(pool);
}

export async function initDb(): Promise<void> {
  if (DB_DRIVER === "postgres") {
    await initPostgres();
    return;
  }

  const db = new Database(sqlitePath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSqliteSchema(db);

  const labRow = db
    .prepare("SELECT valor FROM config WHERE clinica_id = 1 AND chave = 'lab'")
    .get() as { valor: string } | undefined;
  if (!labRow) {
    db.prepare("INSERT INTO config (clinica_id, chave, valor) VALUES (1, 'lab', ?)").run(
      JSON.stringify({ nome: "Laboratório Dental", telefone: "", endereco: "", logoUrl: "" }),
    );
  }

  const adminUser = db
    .prepare("SELECT id FROM lab_usuarios WHERE clinica_id = 1 AND nome = 'admin'")
    .get();
  if (!adminUser) {
    const { randomUUID } = await import("crypto");
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      `INSERT INTO lab_usuarios (id, clinica_id, nome, email, senha_hash, perfil) VALUES (?, 1, 'admin', 'admin@dentallab.local', ?, 'admin')`,
    ).run(randomUUID(), hash);
    console.warn("[dental-lab] Usuário inicial standalone: admin / admin123 — altere a senha em produção.");
  }
  db.prepare(
    `UPDATE lab_usuarios SET email = 'admin@dentallab.local'
     WHERE clinica_id = 1 AND lower(nome) = 'admin' AND (email IS NULL OR email = '')`,
  ).run();

  setSqliteDb(db);
}

let erpPoolSingleton: pg.Pool | null = null;

export function getErpPool(): pg.Pool | null {
  const url = ERP_DATABASE_URL || (DEPLOYMENT_MODE === "embedded" ? DATABASE_URL : "");
  if (!url) return null;
  if (!erpPoolSingleton) {
    erpPoolSingleton = new pg.Pool({ connectionString: url });
  }
  return erpPoolSingleton;
}
