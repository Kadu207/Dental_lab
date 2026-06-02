import type { CreateTenantInput, TenantRecord, UpdateTenantInput } from "./registry.js";

export type TenantPayload = CreateTenantInput & UpdateTenantInput;

const FIELD_MAP: Record<string, keyof TenantPayload> = {
  nomeFantasia: "nomeFantasia",
  razaoSocial: "razaoSocial",
  cnpj: "cnpj",
  cpf: "cpf",
  inscricaoEstadual: "inscricaoEstadual",
  inscricaoMunicipal: "inscricaoMunicipal",
  cep: "cep",
  endereco: "endereco",
  numero: "numero",
  complemento: "complemento",
  bairro: "bairro",
  cidade: "cidade",
  uf: "uf",
  telefone1: "telefone1",
  telefone2: "telefone2",
  whatsapp: "whatsapp",
  email1: "email1",
  email2: "email2",
  responsavelNome: "responsavelNome",
  responsavelContato: "responsavelContato",
  responsavelWhatsapp: "responsavelWhatsapp",
  responsavelEmail: "responsavelEmail",
  instagram: "instagram",
  facebook: "facebook",
  excellenceClinicaId: "excellenceClinicaId",
  clienteCodigo: "clienteCodigo",
  status: "status",
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function intOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export function parseTenantPayload(body: Record<string, unknown>): TenantPayload {
  const out: TenantPayload = {};
  for (const key of Object.keys(FIELD_MAP) as (keyof typeof FIELD_MAP)[]) {
    const target = FIELD_MAP[key]!;
    if (body[key] === undefined && body[camelToSnake(key)] === undefined) continue;
    const raw = body[key] ?? body[camelToSnake(key)];
    if (key === "excellenceClinicaId") {
      out.excellenceClinicaId = intOrNull(raw);
    } else if (key === "status") {
      if (raw === "active" || raw === "suspended" || raw === "provisioning") {
        out.status = raw;
      }
    } else {
      (out as Record<string, unknown>)[target] = trimOrNull(raw);
    }
  }
  return out;
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export const TENANT_SELECT_COLUMNS = `
  clinica_id, postgres_schema, nome_fantasia, razao_social, cnpj, cpf,
  inscricao_estadual, inscricao_municipal, cep, endereco, numero, complemento,
  bairro, cidade, uf, telefone1, telefone2, whatsapp, email1, email2,
  responsavel_nome, responsavel_contato, responsavel_whatsapp, responsavel_email,
  instagram, facebook, excellence_clinica_id, cliente_codigo, status, created_at, updated_at
`;

export function mapTenantRow(row: Record<string, unknown>): TenantRecord {
  return {
    clinicaId: Number(row.clinica_id),
    postgresSchema: String(row.postgres_schema),
    nomeFantasia: row.nome_fantasia != null ? String(row.nome_fantasia) : null,
    razaoSocial: row.razao_social != null ? String(row.razao_social) : null,
    cnpj: row.cnpj != null ? String(row.cnpj) : null,
    cpf: row.cpf != null ? String(row.cpf) : null,
    inscricaoEstadual: row.inscricao_estadual != null ? String(row.inscricao_estadual) : null,
    inscricaoMunicipal: row.inscricao_municipal != null ? String(row.inscricao_municipal) : null,
    cep: row.cep != null ? String(row.cep) : null,
    endereco: row.endereco != null ? String(row.endereco) : null,
    numero: row.numero != null ? String(row.numero) : null,
    complemento: row.complemento != null ? String(row.complemento) : null,
    bairro: row.bairro != null ? String(row.bairro) : null,
    cidade: row.cidade != null ? String(row.cidade) : null,
    uf: row.uf != null ? String(row.uf) : null,
    telefone1: row.telefone1 != null ? String(row.telefone1) : null,
    telefone2: row.telefone2 != null ? String(row.telefone2) : null,
    whatsapp: row.whatsapp != null ? String(row.whatsapp) : null,
    email1: row.email1 != null ? String(row.email1) : null,
    email2: row.email2 != null ? String(row.email2) : null,
    responsavelNome: row.responsavel_nome != null ? String(row.responsavel_nome) : null,
    responsavelContato: row.responsavel_contato != null ? String(row.responsavel_contato) : null,
    responsavelWhatsapp: row.responsavel_whatsapp != null ? String(row.responsavel_whatsapp) : null,
    responsavelEmail: row.responsavel_email != null ? String(row.responsavel_email) : null,
    instagram: row.instagram != null ? String(row.instagram) : null,
    facebook: row.facebook != null ? String(row.facebook) : null,
    excellenceClinicaId:
      row.excellence_clinica_id != null && row.excellence_clinica_id !== ""
        ? Number(row.excellence_clinica_id)
        : null,
    clienteCodigo: row.cliente_codigo != null ? String(row.cliente_codigo) : null,
    status: String(row.status) as TenantRecord["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
