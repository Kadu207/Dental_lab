import bcrypt from "bcryptjs";
import { openLabClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { ensureMatrizTrial, ensureUnidadeTrial } from "../licensing/trial.js";
import type { TenantPayload } from "./tenant-fields.js";

export type TenantBootstrapInput = {
  adminLogin: string;
  adminSenha: string;
  adminEmail?: string | null;
};

export type UnidadeSeedInput = {
  nome: string;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

function redeSocialFromPayload(input: TenantPayload): string | null {
  const parts = [input.instagram, input.facebook].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Copia dados comerciais do registry para a tabela `empresa` do tenant. */
export async function seedTenantEmpresa(clinicaId: number, input: TenantPayload): Promise<void> {
  const db = await openLabClient(clinicaId);
  try {
    const now = new Date().toISOString();
    const fields = [
      input.razaoSocial ?? input.nomeFantasia ?? "Laboratório",
      input.nomeFantasia ?? input.razaoSocial ?? null,
      input.cnpj ?? null,
      input.cpf ?? null,
      input.telefone1 ?? null,
      input.telefone2 ?? input.whatsapp ?? null,
      input.email1 ?? input.responsavelEmail ?? null,
      redeSocialFromPayload(input),
      input.cep ?? null,
      input.endereco ?? null,
      input.numero ?? null,
      input.bairro ?? null,
      input.cidade ?? null,
      input.uf ?? null,
      input.responsavelNome ?? null,
      input.responsavelContato ?? input.responsavelWhatsapp ?? null,
    ];
    await db.run(
      `INSERT INTO empresa (clinica_id, razao_social, nome_fantasia, cnpj, cpf, telefone, celular, email,
         rede_social, cep, endereco, numero, bairro, cidade, estado, nome_responsavel, contato_responsavel, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clinicaId, ...fields, now],
    );
    await ensureMatrizTrial(db, clinicaId);
  } finally {
    await db.release();
  }
}

/** Cria usuário administrador do tenant (acesso somente a este clinica_id). */
export async function seedTenantAdmin(
  clinicaId: number,
  bootstrap: TenantBootstrapInput,
): Promise<string> {
  const login = bootstrap.adminLogin.trim();
  if (!login) throw new Error("Usuário de acesso é obrigatório");
  if (!bootstrap.adminSenha || bootstrap.adminSenha.length < 6) {
    throw new Error("Senha deve ter no mínimo 6 caracteres");
  }

  const db = await openLabClient(clinicaId);
  try {
    const dup = await db.queryOne(
      "SELECT id FROM lab_usuarios WHERE clinica_id = ? AND lower(nome) = lower(?)",
      [clinicaId, login],
    );
    if (dup) throw new Error("Já existe um usuário com este login neste laboratório");

    const id = newId();
    const hash = await bcrypt.hash(bootstrap.adminSenha, 10);
    await db.run(
      `INSERT INTO lab_usuarios (id, clinica_id, nome, email, senha_hash, perfil, ativo)
       VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
      [id, clinicaId, login, bootstrap.adminEmail?.trim() || null, hash],
    );
    return id;
  } finally {
    await db.release();
  }
}

export async function updateTenantAdminCredentials(
  clinicaId: number,
  data: { adminLogin?: string; adminEmail?: string | null; adminSenha?: string },
): Promise<void> {
  const db = await openLabClient(clinicaId);
  try {
    const admin = await db.queryOne<{ id: string; nome: string }>(
      `SELECT id, nome FROM lab_usuarios WHERE clinica_id = ? AND perfil = 'admin' ORDER BY created_at LIMIT 1`,
      [clinicaId],
    );
    if (!admin) {
      if (!data.adminLogin || !data.adminSenha) {
        throw new Error("Administrador do tenant não encontrado; informe usuário e senha");
      }
      await seedTenantAdmin(clinicaId, {
        adminLogin: data.adminLogin,
        adminSenha: data.adminSenha,
        adminEmail: data.adminEmail,
      });
      return;
    }

    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.adminEmail !== undefined) {
      sets.push("email = ?");
      params.push(data.adminEmail?.trim() || null);
    }
    if (data.adminSenha && data.adminSenha.length >= 6) {
      sets.push("senha_hash = ?");
      params.push(await bcrypt.hash(data.adminSenha, 10));
    }
    if (data.adminLogin?.trim() && data.adminLogin.trim() !== admin.nome) {
      const clash = await db.queryOne(
        "SELECT id FROM lab_usuarios WHERE clinica_id = ? AND lower(nome) = lower(?) AND id <> ?",
        [clinicaId, data.adminLogin.trim(), admin.id],
      );
      if (clash) throw new Error("Login já utilizado neste laboratório");
      sets.push("nome = ?");
      params.push(data.adminLogin.trim());
    }

    if (sets.length === 0) return;
    params.push(clinicaId, admin.id);
    await db.run(`UPDATE lab_usuarios SET ${sets.join(", ")} WHERE clinica_id = ? AND id = ?`, params);
  } finally {
    await db.release();
  }
}

export function parseTenantBootstrap(body: Record<string, unknown>): TenantBootstrapInput | null {
  const adminLogin = String(body.adminLogin ?? body.admin_login ?? body.usuario ?? "").trim();
  const adminSenha = String(body.adminSenha ?? body.admin_senha ?? body.senha ?? "");
  const adminEmailRaw = body.adminEmail ?? body.admin_email ?? body.email;
  const adminEmail =
    adminEmailRaw == null || adminEmailRaw === "" ? null : String(adminEmailRaw).trim();

  if (!adminLogin && !adminSenha && !adminEmail) return null;

  return {
    adminLogin,
    adminSenha,
    adminEmail,
  };
}

export function parseTenantUnidades(body: Record<string, unknown>): UnidadeSeedInput[] {
  const raw = body.unidades;
  if (!Array.isArray(raw)) return [];
  const out: UnidadeSeedInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const nome = String(row.nome ?? "").trim();
    if (!nome) continue;
    out.push({
      nome,
      cep: row.cep == null || row.cep === "" ? null : String(row.cep).trim(),
      endereco: row.endereco == null || row.endereco === "" ? null : String(row.endereco).trim(),
      numero: row.numero == null || row.numero === "" ? null : String(row.numero).trim(),
      bairro: row.bairro == null || row.bairro === "" ? null : String(row.bairro).trim(),
      cidade: row.cidade == null || row.cidade === "" ? null : String(row.cidade).trim(),
      estado: row.estado == null || row.estado === "" ? null : String(row.estado).trim().toUpperCase().slice(0, 2),
    });
  }
  return out;
}

/** Cria filiais no schema do tenant (após matriz). */
export async function seedTenantUnidades(
  clinicaId: number,
  unidades: UnidadeSeedInput[],
): Promise<number> {
  if (unidades.length === 0) return 0;
  const db = await openLabClient(clinicaId);
  try {
    let n = 0;
    for (const u of unidades) {
      const id = newId();
      await db.run(
        `INSERT INTO empresa_unidades (id, clinica_id, nome, cep, endereco, numero, bairro, cidade, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clinicaId,
          u.nome,
          u.cep ?? null,
          u.endereco ?? null,
          u.numero ?? null,
          u.bairro ?? null,
          u.cidade ?? null,
          u.estado ?? null,
        ],
      );
      await ensureUnidadeTrial(db, clinicaId, id);
      n += 1;
    }
    return n;
  } finally {
    await db.release();
  }
}
