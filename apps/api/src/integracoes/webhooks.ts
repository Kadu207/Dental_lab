import { Router } from "express";
import { CHATWOOT_WEBHOOK_SECRET, N8N_WEBHOOK_SECRET } from "../config.js";
import { verifyWebhookSecret } from "./emit.js";

export const webhooksRouter = Router();

function readSecretHeader(req: { headers: Record<string, unknown> }): string {
  const h =
    (req.headers["x-dental-lab-webhook-secret"] as string | undefined) ??
    (req.headers["x-webhook-secret"] as string | undefined) ??
    "";
  return h.trim();
}

webhooksRouter.post("/n8n", (req, res) => {
  if (!N8N_WEBHOOK_SECRET) {
    return res.status(503).json({ erro: "Webhook N8N não configurado", code: "WEBHOOK_NOT_CONFIGURED" });
  }
  if (!verifyWebhookSecret(N8N_WEBHOOK_SECRET, readSecretHeader(req))) {
    return res.status(401).json({ erro: "Secret inválido", code: "WEBHOOK_UNAUTHORIZED" });
  }
  console.info("[webhooks/n8n] evento recebido", typeof req.body?.type === "string" ? req.body.type : "unknown");
  res.json({ ok: true });
});

webhooksRouter.post("/chatwoot", (req, res) => {
  if (!CHATWOOT_WEBHOOK_SECRET) {
    return res.status(503).json({
      erro: "Webhook Chatwoot não configurado",
      code: "WEBHOOK_NOT_CONFIGURED",
    });
  }
  if (!verifyWebhookSecret(CHATWOOT_WEBHOOK_SECRET, readSecretHeader(req))) {
    return res.status(401).json({ erro: "Secret inválido", code: "WEBHOOK_UNAUTHORIZED" });
  }
  console.info(
    "[webhooks/chatwoot] evento recebido",
    typeof req.body?.type === "string" ? req.body.type : "unknown",
  );
  res.json({ ok: true });
});
