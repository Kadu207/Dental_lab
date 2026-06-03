import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { LabDbClient } from "../db/client.js";
import { JWT_SECRET, PLATFORM_SCHEMA } from "../config.js";
import { getPgPool } from "../db/pool.js";

const RESET_TTL_MINUTES = 15;

export type PasswordResetScope = "platform" | "tenant";

interface ResetTokenPayload {
  type: "password_reset";
  user_id: string;
  clinica_id: number;
  scope: PasswordResetScope;
}

export function signPasswordResetToken(
  userId: string,
  clinicaId: number,
  scope: PasswordResetScope,
): string {
  const payload: ResetTokenPayload = {
    type: "password_reset",
    user_id: userId,
    clinica_id: clinicaId,
    scope,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${RESET_TTL_MINUTES}m` });
}

export function verifyPasswordResetToken(token: string): {
  userId: string;
  clinicaId: number;
  scope: PasswordResetScope;
} {
  const payload = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
  if (payload.type !== "password_reset") throw new Error("Token de recuperação inválido");
  return {
    userId: payload.user_id,
    clinicaId: Number(payload.clinica_id),
    scope: payload.scope ?? "tenant",
  };
}

export async function requestPasswordResetTenant(
  db: LabDbClient,
  usuario: string,
  email: string,
  clinicaId = 1,
): Promise<string | null> {
  const user = await db.queryOne<{ id: string; email: string | null; ativo: number | boolean }>(
    `SELECT id, email, ativo FROM lab_usuarios
     WHERE clinica_id = ? AND lower(nome) = lower(?) AND lower(coalesce(email, '')) = lower(?)`,
    [clinicaId, usuario.trim(), email.trim()],
  );

  if (!user || user.ativo === 0 || user.ativo === false) return null;
  return signPasswordResetToken(user.id, clinicaId, "tenant");
}

export async function requestPasswordResetPlatform(
  pool: Pool,
  usuario: string,
  email: string,
): Promise<string | null> {
  const r = await pool.query<{ id: string; ativo: boolean }>(
    `SELECT id, ativo FROM ${PLATFORM_SCHEMA}.platform_usuarios
     WHERE lower(nome) = lower($1) AND lower(coalesce(email, '')) = lower($2)`,
    [usuario.trim(), email.trim()],
  );
  if (r.rowCount === 0) return null;
  const user = r.rows[0];
  if (!user.ativo) return null;
  return signPasswordResetToken(user.id, 0, "platform");
}

/** Tenta supervisor (platform) e depois usuário do tenant. */
export async function requestPasswordResetUnified(
  db: LabDbClient,
  usuario: string,
  email: string,
  clinicaId = 1,
): Promise<string | null> {
  const pool = getPgPool();
  if (pool) {
    const platformToken = await requestPasswordResetPlatform(pool, usuario, email);
    if (platformToken) return platformToken;
  }
  return requestPasswordResetTenant(db, usuario, email, clinicaId);
}

export async function resetPasswordWithToken(
  db: LabDbClient,
  token: string,
  novaSenha: string,
): Promise<void> {
  if (!novaSenha || novaSenha.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres");
  }

  const { userId, clinicaId, scope } = verifyPasswordResetToken(token);
  const hash = await bcrypt.hash(novaSenha, 10);

  if (scope === "platform") {
    const pool = getPgPool();
    if (!pool) throw new Error("Recuperação de supervisor indisponível");
    const r = await pool.query<{ id: string; ativo: boolean }>(
      `SELECT id, ativo FROM ${PLATFORM_SCHEMA}.platform_usuarios WHERE id = $1`,
      [userId],
    );
    if (r.rowCount === 0) throw new Error("Usuário não encontrado ou inativo");
    const user = r.rows[0];
    if (!user.ativo) throw new Error("Usuário não encontrado ou inativo");
    await pool.query(`UPDATE ${PLATFORM_SCHEMA}.platform_usuarios SET senha_hash = $1 WHERE id = $2`, [
      hash,
      userId,
    ]);
    return;
  }

  const user = await db.queryOne<{ id: string; ativo: number | boolean }>(
    "SELECT id, ativo FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
    [clinicaId, userId],
  );

  if (!user || user.ativo === 0 || user.ativo === false) {
    throw new Error("Usuário não encontrado ou inativo");
  }

  await db.run("UPDATE lab_usuarios SET senha_hash = ? WHERE clinica_id = ? AND id = ?", [
    hash,
    clinicaId,
    userId,
  ]);
}

/** @deprecated use requestPasswordResetTenant */
export async function requestPasswordReset(
  db: LabDbClient,
  usuario: string,
  email: string,
  clinicaId = 1,
): Promise<string | null> {
  return requestPasswordResetTenant(db, usuario, email, clinicaId);
}
