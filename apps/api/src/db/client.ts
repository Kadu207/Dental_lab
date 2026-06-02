import type Database from "better-sqlite3";
import type { PoolClient, QueryResultRow } from "pg";
import { POSTGRES_SCHEMA } from "../config.js";
import { getPgPool, getSqliteDb, setPgPool, setSqliteDb } from "./pool.js";
import { resolveTenantSchema } from "../tenants/registry.js";

export { getPgPool, getSqliteDb, setPgPool, setSqliteDb };

export type DbDriverKind = "sqlite" | "postgres";

export interface LabConfigDb {
  nome: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
  tamanhoEtiquetaPadrao?: "termica_100x50" | "termica_50x30" | "a4";
}

function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Cliente de banco com escopo de clínica (multi-tenant). */
export class LabDbClient {
  private readonly pgClient?: PoolClient;

  constructor(
    public readonly driver: DbDriverKind,
    public readonly clinicaId: number,
    private readonly sqlite?: Database.Database,
    pgClient?: PoolClient,
    private readonly pgSchema: string = POSTGRES_SCHEMA,
  ) {
    this.pgClient = pgClient;
  }

  private qualify(sql: string): string {
    if (this.driver !== "postgres") return sql;
    return sql.replace(
      /\b(clientes|fornecedores|estoque|proteses|status_historico|config|lab_usuarios|empresa|empresa_unidades|financeiro|procedimentos|grupos_permissoes|product_licenses)\b/g,
      `${this.pgSchema}.$1`,
    );
  }

  private prepare(sql: string, params: unknown[]): { text: string; values: unknown[] } {
    const qualified = this.qualify(sql);
    if (this.driver === "postgres") {
      return { text: toPgPlaceholders(qualified), values: params };
    }
    return { text: qualified, values: params };
  }

  async queryAll<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { text, values } = this.prepare(sql, params);
    if (this.driver === "sqlite" && this.sqlite) {
      return this.sqlite.prepare(text).all(...values) as T[];
    }
    if (this.pgClient) {
      const r = await this.pgClient.query<T>(text, values);
      return r.rows;
    }
    throw new Error("Banco não inicializado");
  }

  async queryOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.queryAll<T>(sql, params);
    return rows[0];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const { text, values } = this.prepare(sql, params);
    if (this.driver === "sqlite" && this.sqlite) {
      const info = this.sqlite.prepare(text).run(...values);
      return { changes: info.changes };
    }
    if (this.pgClient) {
      const r = await this.pgClient.query(text, values);
      return { changes: r.rowCount ?? 0 };
    }
    throw new Error("Banco não inicializado");
  }

  async release(): Promise<void> {
    if (this.pgClient) this.pgClient.release();
  }

  async getLabConfig(): Promise<LabConfigDb> {
    const row = await this.queryOne<{ valor: string }>(
      "SELECT valor FROM config WHERE clinica_id = ? AND chave = 'lab'",
      [this.clinicaId],
    );
    const cfg = row ? JSON.parse(row.valor) : { nome: "Laboratório Dental" };
    return { nome: cfg.nome ?? "Laboratório Dental", ...cfg };
  }

  async setLabConfig(config: LabConfigDb): Promise<void> {
    if (this.driver === "postgres") {
      await this.run(
        `INSERT INTO config (clinica_id, chave, valor) VALUES (?, 'lab', ?)
         ON CONFLICT (clinica_id, chave) DO UPDATE SET valor = EXCLUDED.valor`,
        [this.clinicaId, JSON.stringify(config)],
      );
      return;
    }
    await this.run("INSERT OR REPLACE INTO config (clinica_id, chave, valor) VALUES (?, 'lab', ?)", [
      this.clinicaId,
      JSON.stringify(config),
    ]);
  }

  async getNextProteseSeq(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `PROT-${today}-`;
    const row = await this.queryOne<{ m: number }>(
      `SELECT COALESCE(MAX(CAST(substr(codigo, -4) AS INTEGER)), 0) as m FROM proteses WHERE clinica_id = ? AND codigo LIKE ?`,
      [this.clinicaId, `${prefix}%`],
    );
    return Number(row?.m ?? 0) + 1;
  }
}

export async function openLabClient(clinicaId: number): Promise<LabDbClient> {
  const pgPool = getPgPool();
  if (pgPool) {
    const client = await pgPool.connect();
    const pgSchema = await resolveTenantSchema(clinicaId);
    return new LabDbClient("postgres", clinicaId, undefined, client, pgSchema);
  }
  const sqliteDb = getSqliteDb();
  if (sqliteDb) {
    return new LabDbClient("sqlite", clinicaId, sqliteDb);
  }
  throw new Error("Nenhum driver de banco configurado");
}

export async function withLabClient<T>(clinicaId: number, fn: (db: LabDbClient) => Promise<T>): Promise<T> {
  const client = await openLabClient(clinicaId);
  try {
    return await fn(client);
  } finally {
    await client.release();
  }
}
