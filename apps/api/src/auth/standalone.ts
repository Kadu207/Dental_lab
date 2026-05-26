import bcrypt from "bcryptjs";
import type { LabDbClient } from "../db/client.js";
import { newId } from "../db/index.js";
import { signLabToken } from "./jwt.js";
import type { AuthContext } from "./types.js";

export async function loginStandalone(
  db: LabDbClient,
  nome: string,
  senha: string,
  clinicaId = 1,
): Promise<{ token: string; auth: AuthContext; expiresInMinutes: number }> {
  const user = await db.queryOne<{
    id: string;
    nome: string;
    senha_hash: string;
    perfil: string;
    ativo: number | boolean;
  }>(
    "SELECT id, nome, senha_hash, perfil, ativo FROM lab_usuarios WHERE clinica_id = ? AND lower(nome) = lower(?)",
    [clinicaId, nome.trim()],
  );

  if (!user || user.ativo === 0 || user.ativo === false) {
    throw new Error("Credenciais inválidas");
  }

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) throw new Error("Credenciais inválidas");

  const auth: AuthContext = {
    mode: "standalone",
    clinicaId,
    userId: user.id,
    sub: user.nome,
    perfil: user.perfil,
  };

  return {
    token: signLabToken(auth),
    auth,
    expiresInMinutes: Number(process.env.DENTAL_LAB_JWT_TTL_MINUTES ?? "480"),
  };
}

export async function ensureStandaloneUser(
  db: LabDbClient,
  data: { nome: string; senha: string; perfil?: string; email?: string; clinicaId?: number },
) {
  const clinicaId = data.clinicaId ?? 1;
  const hash = await bcrypt.hash(data.senha, 10);
  const id = newId();
  await db.run(
    `INSERT INTO lab_usuarios (id, clinica_id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, clinicaId, data.nome.trim(), data.email ?? null, hash, data.perfil ?? "admin"],
  );
  return id;
}
