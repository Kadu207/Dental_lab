import { Router } from "express";
import type { IncomingHttpHeaders } from "http";
import { CHATWOOT_WEBHOOK_SECRET, N8N_WEBHOOK_SECRET } from "../config.js";
import { claimInboundWebhook, resolveIdempotencyKey } from "../reliability/idempotency.js";
import { verifyWebhookSecret } from "./emit.js";

export const webhooksRouter = Router();

function readSecretHeader(req: { headers: Record<string, unknown> }): string {
  const h =
    (req.headers["x-dental-lab-webhook-secret"] as string | undefined) ??
    (req.headers["x-webhook-secret"] as string | undefined) ??
    "";
  return h.trim();
}

webhooksRouter.post("/n8n", async (req, res) => {
  if (!N8N_WEBHOOK_SECRET) {
    return res.status(503).json({ erro: "Webhook N8N não configurado", code: "WEBHOOK_NOT_CONFIGURED" });
  }
  if (!verifyWebhookSecret(N8N_WEBHOOK_SECRET, readSecretHeader(req))) {
    return res.status(401).json({ erro: "Secret inválido", code: "WEBHOOK_UNAUTHORIZED" });
  }
  const claim = await acceptWebhook("n8n", req.headers, req.body);
  if (!claim.ok) {
    return res.status(503).json({ erro: "Não foi possível registrar o evento", code: "WEBHOOK_STORE_UNAVAILABLE" });
  }
  if (claim.duplicate) {
    return res.json({ ok: true, deduplicated: true });
  }
  console.info("[webhooks/n8n] evento recebido", claim.eventType);
  res.json({ ok: true });
});

webhooksRouter.post("/chatwoot", async (req, res) => {
  if (!CHATWOOT_WEBHOOK_SECRET) {
    return res.status(503).json({
      erro: "Webhook Chatwoot não configurado",
      code: "WEBHOOK_NOT_CONFIGURED",
    });
  }
  if (!verifyWebhookSecret(CHATWOOT_WEBHOOK_SECRET, readSecretHeader(req))) {
    return res.status(401).json({ erro: "Secret inválido", code: "WEBHOOK_UNAUTHORIZED" });
  }
  const claim = await acceptWebhook("chatwoot", req.headers, req.body);
  if (!claim.ok) {
    return res.status(503).json({ erro: "Não foi possível registrar o evento", code: "WEBHOOK_STORE_UNAVAILABLE" });
  }
  if (claim.duplicate) {
    return res.json({ ok: true, deduplicated: true });
  }
  console.info("[webhooks/chatwoot] evento recebido", claim.eventType);
  res.json({ ok: true });
});

async function acceptWebhook(
  channel: "n8n" | "chatwoot",
  headers: IncomingHttpHeaders,
  body: unknown,
): Promise<{ ok: true; duplicate: boolean; eventType: string } | { ok: false }> {
  const resolved = resolveIdempotencyKey(headers, body);
  try {
    const claim = await claimInboundWebhook({
      channel,
      idempotencyKey: resolved.key,
      eventType: resolved.eventType,
      payloadHash: resolved.payloadHash,
    });
    return { ok: true, duplicate: claim === "duplicate", eventType: resolved.eventType };
  } catch (error) {
    console.error("[webhooks] falha ao registrar idempotência", channel, error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
