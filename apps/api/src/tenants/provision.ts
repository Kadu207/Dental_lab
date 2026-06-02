import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Pool } from "pg";
import { POSTGRES_SCHEMA } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function tenantSchemaSql(schemaName: string): string {
  const base = fs.readFileSync(path.join(__dirname, "..", "db", "schema-postgres.sql"), "utf8");
  return base.replace(/\bdental_lab\b/g, schemaName);
}

/** Aplica DDL completo do módulo Lab em um schema dedicado ao tenant. */
export async function provisionTenantSchema(pool: Pool, schemaName: string): Promise<void> {
  if (!/^[a-z][a-z0-9_]*$/.test(schemaName)) {
    throw new Error("Nome de schema inválido");
  }
  if (schemaName === POSTGRES_SCHEMA) {
    throw new Error("Não provisionar sobre o schema legado padrão");
  }

  await pool.query(tenantSchemaSql(schemaName));

  await pool.query(`ALTER TABLE ${schemaName}.clientes ADD COLUMN IF NOT EXISTS erp_paciente_id TEXT`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_clientes_erp ON ${schemaName}.clientes (clinica_id, erp_paciente_id) WHERE erp_paciente_id IS NOT NULL`,
  );
  await pool.query(
    `ALTER TABLE ${schemaName}.proteses ADD COLUMN IF NOT EXISTS setor TEXT NOT NULL DEFAULT 'gesso'`,
  );
  await pool.query(`ALTER TABLE ${schemaName}.lab_usuarios ADD COLUMN IF NOT EXISTS permissoes TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.lab_usuarios ADD COLUMN IF NOT EXISTS descricao TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.product_licenses ADD COLUMN IF NOT EXISTS unidade_id TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.empresa ADD COLUMN IF NOT EXISTS trial_started_at TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.empresa ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.empresa_unidades ADD COLUMN IF NOT EXISTS trial_started_at TEXT`);
  await pool.query(`ALTER TABLE ${schemaName}.empresa_unidades ADD COLUMN IF NOT EXISTS trial_ends_at TEXT`);
}
