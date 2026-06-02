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

CREATE TABLE IF NOT EXISTS dental_lab_platform.tenant_backup_log (
  id SERIAL PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  postgres_schema TEXT NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backup_log_clinica ON dental_lab_platform.tenant_backup_log (clinica_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_log_created ON dental_lab_platform.tenant_backup_log (created_at DESC);

-- Cadastro completo de empresas (supervisor)
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS telefone1 TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS telefone2 TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS email1 TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS email2 TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS responsavel_nome TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS responsavel_contato TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS responsavel_whatsapp TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS responsavel_email TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE dental_lab_platform.tenants ADD COLUMN IF NOT EXISTS excellence_clinica_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_tenants_excellence_clinica ON dental_lab_platform.tenants (excellence_clinica_id)
  WHERE excellence_clinica_id IS NOT NULL;
