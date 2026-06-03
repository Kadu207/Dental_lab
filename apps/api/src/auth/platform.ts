import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { PLATFORM_SCHEMA } from "../config.js";
import { getPgPool } from "../db/pool.js";
import { newId } from "../db/index.js";
import { signLabToken } from "./jwt.js";
import type { AuthContext } from "./types.js";

export async function loginPlatformUser(
  nome: string,
  senha: string,
): Promise<{ token: string; auth: AuthContext; expiresInMinutes: number } | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const r = await pool.query<{
    id: string;
    nome: string;
    senha_hash: string;
    perfil: string;
    ativo: boolean;
  }>(
    `SELECT id, nome, senha_hash, perfil, ativo
     FROM ${PLATFORM_SCHEMA}.platform_usuarios
     WHERE lower(nome) = lower($1)`,
    [nome.trim()],
  );

  if (r.rowCount === 0) return null;
  const user = r.rows[0];
  if (!user.ativo) return null;

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) return null;

  const auth: AuthContext = {
    mode: "standalone",
    clinicaId: 0,
    userId: user.id,
    sub: user.nome,
    perfil: user.perfil,
    isPlatformUser: true,
  };

  return {
    token: signLabToken(auth),
    auth,
    expiresInMinutes: Number(process.env.DENTAL_LAB_JWT_TTL_MINUTES ?? "480"),
  };
}

export async function ensurePlatformSupervisor(pool: Pool, senha: string): Promise<void> {
  const check = await pool.query(`SELECT id FROM ${PLATFORM_SCHEMA}.platform_usuarios WHERE nome = $1`, [
    "supervisor",
  ]);
  if (check.rowCount && check.rowCount > 0) return;

  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO ${PLATFORM_SCHEMA}.platform_usuarios (id, nome, email, senha_hash, perfil)
     VALUES ($1, 'supervisor', 'supervisor@inovatitech.local', $2, 'supervisor')`,
    [newId(), hash],
  );
  console.warn("[dental-lab] Supervisor inicial: supervisor / (senha do env) — altere em produção.");
}

/** Admin de plataforma (integrações Chatwoot, N8N, etc.) — mesmas rotas /supervisor que o supervisor. */
export async function ensurePlatformAdmin(pool: Pool, senha: string): Promise<void> {
  const check = await pool.query(`SELECT id FROM ${PLATFORM_SCHEMA}.platform_usuarios WHERE nome = $1`, [
    "admin",
  ]);
  if (check.rowCount && check.rowCount > 0) return;

  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO ${PLATFORM_SCHEMA}.platform_usuarios (id, nome, email, senha_hash, perfil)
     VALUES ($1, 'admin', 'admin@inovatitech.local', $2, 'admin')`,
    [newId(), hash],
  );
  console.warn("[dental-lab] Admin plataforma inicial: admin / (senha do env) — altere em produção.");
}

export async function changePlatformUserPassword(
  userId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  if (!novaSenha || novaSenha.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres");
  }

  const pool = getPgPool();
  if (!pool) throw new Error("Alteração de senha disponível apenas com Postgres");

  const r = await pool.query<{ id: string; senha_hash: string; ativo: boolean }>(
    `SELECT id, senha_hash, ativo FROM ${PLATFORM_SCHEMA}.platform_usuarios WHERE id = $1`,
    [userId],
  );
  if (r.rowCount === 0) throw new Error("Usuário não encontrado");
  const user = r.rows[0];
  if (!user.ativo) throw new Error("Usuário inativo");

  const ok = await bcrypt.compare(senhaAtual, user.senha_hash);
  if (!ok) throw new Error("Senha atual incorreta");

  const hash = await bcrypt.hash(novaSenha, 10);
  await pool.query(`UPDATE ${PLATFORM_SCHEMA}.platform_usuarios SET senha_hash = $1 WHERE id = $2`, [
    hash,
    userId,
  ]);
}
