-- Schema dedicado ao módulo laboratório (standalone ou embedded no mesmo Postgres do ERP)
CREATE SCHEMA IF NOT EXISTS dental_lab;

CREATE TABLE IF NOT EXISTS dental_lab.lab_usuarios (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL DEFAULT 1,
  nome TEXT NOT NULL,
  email TEXT,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, nome)
);

CREATE TABLE IF NOT EXISTS dental_lab.clientes (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_clientes_clinica ON dental_lab.clientes (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.fornecedores (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_fornecedores_clinica ON dental_lab.fornecedores (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.estoque (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantidade_minima DOUBLE PRECISION NOT NULL DEFAULT 0,
  fornecedor_id TEXT REFERENCES dental_lab.fornecedores(id),
  preco_unitario DOUBLE PRECISION,
  localizacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_lab_estoque_clinica ON dental_lab.estoque (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.proteses (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  codigo TEXT NOT NULL,
  codigo_barras TEXT NOT NULL,
  paciente_id TEXT NOT NULL REFERENCES dental_lab.clientes(id),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, codigo),
  UNIQUE (clinica_id, codigo_barras)
);
CREATE INDEX IF NOT EXISTS idx_lab_proteses_clinica ON dental_lab.proteses (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.status_historico (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  protese_id TEXT NOT NULL REFERENCES dental_lab.proteses(id),
  status TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_historico_clinica ON dental_lab.status_historico (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.config (
  clinica_id INTEGER NOT NULL,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  PRIMARY KEY (clinica_id, chave)
);

CREATE TABLE IF NOT EXISTS dental_lab.product_licenses (
  id SERIAL PRIMARY KEY,
  license_key VARCHAR(25) NOT NULL UNIQUE,
  clinica_id INTEGER,
  unidade_id TEXT,
  produto VARCHAR(32) NOT NULL DEFAULT 'lab',
  periodo VARCHAR(16) NOT NULL DEFAULT 'trial',
  cliente_nome TEXT DEFAULT '',
  starts_at TEXT DEFAULT '',
  ends_at TEXT DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  activated_at TEXT,
  lab_secret TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  created_by TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_lab_product_licenses_clinica ON dental_lab.product_licenses (clinica_id);
CREATE INDEX IF NOT EXISTS idx_lab_product_licenses_key ON dental_lab.product_licenses (license_key);

CREATE TABLE IF NOT EXISTS dental_lab.empresa (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dental_lab.empresa_unidades (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  trial_started_at TEXT,
  trial_ends_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_empresa_unidades_clinica ON dental_lab.empresa_unidades (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.financeiro (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor DOUBLE PRECISION NOT NULL DEFAULT 0,
  data_vencimento TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_financeiro_clinica ON dental_lab.financeiro (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.procedimentos (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  valor DOUBLE PRECISION NOT NULL DEFAULT 0,
  custo_estimado DOUBLE PRECISION NOT NULL DEFAULT 0,
  gera_comissao TEXT NOT NULL DEFAULT 'Não',
  comissao_perc DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_lab_procedimentos_clinica ON dental_lab.procedimentos (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.grupos_permissoes (
  id TEXT PRIMARY KEY,
  clinica_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinica_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lab_grupos_clinica ON dental_lab.grupos_permissoes (clinica_id);

CREATE TABLE IF NOT EXISTS dental_lab.odontograma (
  clinica_id INTEGER NOT NULL,
  paciente_id TEXT NOT NULL,
  dentes TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clinica_id, paciente_id)
);
CREATE INDEX IF NOT EXISTS idx_lab_odontograma_clinica ON dental_lab.odontograma (clinica_id);
