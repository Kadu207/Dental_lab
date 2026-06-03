import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  APP_PUBLIC_URL,
  SMTP_ENABLED,
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_ENABLED || !SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(getTransporter());
}

export async function sendPasswordResetEmail(
  to: string,
  usuario: string,
  resetToken: string,
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  const resetUrl = `${APP_PUBLIC_URL.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(resetToken)}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #0f172a;">
  <div style="max-width: 520px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #7c3aed; margin-bottom: 8px;">Dental Lab — Recuperação de senha</h2>
    <p>Olá, <strong>${escapeHtml(usuario)}</strong>.</p>
    <p>Recebemos uma solicitação para redefinir sua senha de acesso ao sistema.</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Redefinir minha senha
      </a>
    </p>
    <p style="font-size: 0.9rem; color: #64748b;">O link expira em 15 minutos. Se você não solicitou esta alteração, ignore este e-mail.</p>
    <p style="font-size: 0.8rem; color: #94a3b8; word-break: break-all;">${resetUrl}</p>
  </div>
</body>
</html>`;

  const text = `Dental Lab — Recuperação de senha\n\nOlá, ${usuario}.\n\nAcesse o link para redefinir sua senha (válido por 15 minutos):\n${resetUrl}\n\nSe não solicitou, ignore este e-mail.`;

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject: "Dental Lab — Redefinir senha",
      text,
      html,
    });
    return true;
  } catch (e) {
    console.error("[dental-lab] Falha ao enviar e-mail de recuperação:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
