-- Registry central multi-tenant (standalone VPS — um cluster Postgres, schema por empresa)
CREATE SCHEMA IF NOT EXISTS dental_lab_platform;

CREATE TABLE IF NOT EXISTS dental_lab_platform.tenants (
  clinica_id INTEGER PRIMARY KEY,
  postgres_schema TEXT NOT NULL UNIQUE,
  nome_fantasia TEXT,
  razao_social TEXT,
  cnpj TEXT,
  cliente_codigo TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON dental_lab_platform.tenants (status);
CREATE INDEX IF NOT EXISTS idx_tenants_cliente_codigo ON dental_lab_platform.tenants (cliente_codigo)
  WHERE cliente_codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS dental_lab_platform.platform_usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'supervisor',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
