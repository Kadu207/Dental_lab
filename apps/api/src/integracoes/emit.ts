import { createHmac, randomUUID } from "crypto";
import {
  CHATWOOT_WEBHOOK_SECRET,
  CHATWOOT_WEBHOOK_URL,
  DEPLOYMENT_MODE,
  INTEGRATIONS_ENABLED,
  INTEGRATIONS_FORCE_IN_EMBEDDED,
  N8N_WEBHOOK_SECRET,
  N8N_WEBHOOK_URL,
} from "../config.js";
import { safeCompare } from "../licensing/core.js";
import { isRetryableStatus, isTransientNetworkError, RetryableHttpError, withRetry } from "../reliability/retry.js";

export type IntegrationEventType =
  | "tenant_onboarded"
  | "tenant_updated"
  | "tenant_suspended"
  | "licenca_gerada"
  | "manual_test"
  | "cam_asset_imported"
  | "cam_job_done";

export type IntegrationChannel = "n8n" | "chatwoot";

export function shouldEmitIntegrations(): boolean {
  if (!INTEGRATIONS_ENABLED) return false;
  if (DEPLOYMENT_MODE === "embedded" && !INTEGRATIONS_FORCE_IN_EMBEDDED) return false;
  return true;
}

export function signBodyHmac(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export function verifyBodyHmac(secret: string, body: string, signature: string | undefined): boolean {
  if (!secret) return false;
  if (!signature?.trim()) return false;
  const expected = signBodyHmac(secret, body);
  return safeCompare(signature.trim().toLowerCase(), expected.toLowerCase());
}

export function verifyWebhookSecret(configured: string, headerValue: string | undefined): boolean {
  if (!configured) return false;
  if (!headerValue?.trim()) return false;
  return safeCompare(headerValue.trim(), configured);
}

function maskUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.length > 24 ? `${u.pathname.slice(0, 24)}…` : u.pathname}`;
  } catch {
    return "(url inválida)";
  }
}

export function getIntegrationsStatus() {
  return {
    enabled: INTEGRATIONS_ENABLED,
    willEmit: shouldEmitIntegrations(),
    deploymentMode: DEPLOYMENT_MODE,
    forceInEmbedded: INTEGRATIONS_FORCE_IN_EMBEDDED,
    n8n: {
      configured: Boolean(N8N_WEBHOOK_URL),
      url: maskUrl(N8N_WEBHOOK_URL),
      hasSecret: Boolean(N8N_WEBHOOK_SECRET),
    },
    chatwoot: {
      configured: Boolean(CHATWOOT_WEBHOOK_URL),
      url: maskUrl(CHATWOOT_WEBHOOK_URL),
      hasSecret: Boolean(CHATWOOT_WEBHOOK_SECRET),
    },
  };
}

export type OutboundResult = {
  channel: IntegrationChannel;
  ok: boolean;
  status?: number;
  error?: string;
  skipped?: boolean;
};

export type OutboundDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  baseMs?: number;
  maxAttempts?: number;
  timeoutMs?: number;
};

function readEventId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("id" in payload)) return undefined;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

export async function postOutboundHmac(
  channel: IntegrationChannel,
  url: string,
  secret: string,
  payload: unknown,
  deps: OutboundDeps = {},
): Promise<OutboundResult> {
  if (!url) {
    return { channel, ok: false, skipped: true, error: "URL não configurada" };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Dental-Lab-Event": String((payload as { type?: string })?.type ?? "unknown"),
  };
  const eventId = readEventId(payload);
  if (eventId) headers["Idempotency-Key"] = eventId;
  if (secret) {
    headers["X-Dental-Lab-Signature"] = signBodyHmac(secret, body);
  }

  const timeoutMs = deps.timeoutMs ?? 10_000;

  try {
    const res = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        timer.unref?.();
        try {
          const response = await fetchImpl(url, { method: "POST", headers, body, signal: controller.signal });
          if (isRetryableStatus(response.status)) {
            const text = await response.text().catch(() => "");
            throw new RetryableHttpError(response.status, text.slice(0, 200));
          }
          return response;
        } finally {
          clearTimeout(timer);
        }
      },
      {
        maxAttempts: deps.maxAttempts ?? 3,
        baseMs: deps.baseMs ?? 200,
        shouldRetry: (error) => error instanceof RetryableHttpError || isTransientNetworkError(error),
        sleep: deps.sleep,
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        channel,
        ok: false,
        status: res.status,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    return { channel, ok: true, status: res.status };
  } catch (e) {
    if (e instanceof RetryableHttpError) {
      return {
        channel,
        ok: false,
        status: e.status,
        error: e.body || `HTTP ${e.status}`,
      };
    }
    return {
      channel,
      ok: false,
      error: e instanceof Error ? e.message : "Falha de rede",
    };
  }
}

export async function dispatchToChannels(
  type: IntegrationEventType,
  data: Record<string, unknown>,
  channels: IntegrationChannel[] = ["n8n", "chatwoot"],
): Promise<OutboundResult[]> {
  const payload = {
    id: randomUUID(),
    type,
    source: "dental-lab",
    deploymentMode: DEPLOYMENT_MODE,
    at: new Date().toISOString(),
    data,
  };

  const jobs: Promise<OutboundResult>[] = [];
  if (channels.includes("n8n")) {
    jobs.push(postOutboundHmac("n8n", N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, payload));
  }
  if (channels.includes("chatwoot")) {
    jobs.push(postOutboundHmac("chatwoot", CHATWOOT_WEBHOOK_URL, CHATWOOT_WEBHOOK_SECRET, payload));
  }
  return Promise.all(jobs);
}

/**
 * Disparo não bloqueante. Falha de webhook não deve reverter domínio.
 */
export function emitIntegrationEvent(
  type: IntegrationEventType,
  data: Record<string, unknown>,
): void {
  if (!shouldEmitIntegrations()) return;
  void dispatchToChannels(type, data).catch((err) => {
    console.warn("[integracoes] emit falhou:", type, err instanceof Error ? err.message : err);
  });
}
