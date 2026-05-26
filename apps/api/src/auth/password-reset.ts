import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { LabDbClient } from "../db/client.js";
import { JWT_SECRET } from "../config.js";

const RESET_TTL_MINUTES = 15;

interface ResetTokenPayload {
  type: "password_reset";
  user_id: string;
  clinica_id: number;
}

export function signPasswordResetToken(userId: string, clinicaId: number): string {
  const payload: ResetTokenPayload = {
    type: "password_reset",
    user_id: userId,
    clinica_id: clinicaId,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${RESET_TTL_MINUTES}m` });
}

export function verifyPasswordResetToken(token: string): { userId: string; clinicaId: number } {
  const payload = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
  if (payload.type !== "password_reset") throw new Error("Token de recuperação inválido");
  return { userId: payload.user_id, clinicaId: Number(payload.clinica_id) };
}

export async function requestPasswordReset(
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
  return signPasswordResetToken(user.id, clinicaId);
}

export async function resetPasswordWithToken(
  db: LabDbClient,
  token: string,
  novaSenha: string,
): Promise<void> {
  if (!novaSenha || novaSenha.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres");
  }

  const { userId, clinicaId } = verifyPasswordResetToken(token);
  const user = await db.queryOne<{ id: string; ativo: number | boolean }>(
    "SELECT id, ativo FROM lab_usuarios WHERE clinica_id = ? AND id = ?",
    [clinicaId, userId],
  );

  if (!user || user.ativo === 0 || user.ativo === false) {
    throw new Error("Usuário não encontrado ou inativo");
  }

  const hash = await bcrypt.hash(novaSenha, 10);
  await db.run("UPDATE lab_usuarios SET senha_hash = ? WHERE clinica_id = ? AND id = ?", [
    hash,
    clinicaId,
    userId,
  ]);
}
