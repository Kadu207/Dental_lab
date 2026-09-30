import { describe, expect, it, vi } from "vitest";
import { postOutboundHmac, signBodyHmac, verifyBodyHmac, verifyWebhookSecret } from "./emit.js";

describe("integracoes hmac", () => {
  it("assina e verifica corpo", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ type: "manual_test", data: { a: 1 } });
    const sig = signBodyHmac(secret, body);
    expect(verifyBodyHmac(secret, body, sig)).toBe(true);
    expect(verifyBodyHmac(secret, body, "deadbeef")).toBe(false);
    expect(verifyBodyHmac(secret, body + "x", sig)).toBe(false);
  });

  it("compara secret de webhook de forma segura", () => {
    expect(verifyWebhookSecret("abc", "abc")).toBe(true);
    expect(verifyWebhookSecret("abc", "abd")).toBe(false);
    expect(verifyWebhookSecret("", "abc")).toBe(false);
    expect(verifyWebhookSecret("abc", undefined)).toBe(false);
  });

  it("repete 5xx com a mesma chave e não repete 4xx", async () => {
    const calls: { key?: string; body?: string }[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      calls.push({ key: headers["Idempotency-Key"], body: String(init?.body ?? "") });
      if (calls.length === 1) {
        return new Response("falhou", { status: 503 });
      }
      return new Response("ok", { status: 200 });
    });

    const result = await postOutboundHmac(
      "n8n",
      "https://example.test/hook",
      "secret",
      { id: "evt-estavel-1", type: "manual_test" },
      { fetchImpl: fetchImpl as typeof fetch, sleep: async () => undefined, maxAttempts: 3 },
    );

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.key).toBe("evt-estavel-1");
    expect(calls[1]?.key).toBe("evt-estavel-1");
    expect(calls[0]?.body).toBe(calls[1]?.body);

    const denied = vi.fn(async () => new Response("nao", { status: 400 }));
    const failed = await postOutboundHmac("n8n", "https://example.test/hook", "", { id: "evt-2" }, {
      fetchImpl: denied as typeof fetch,
      sleep: async () => undefined,
    });
    expect(failed.ok).toBe(false);
    expect(failed.status).toBe(400);
    expect(denied).toHaveBeenCalledTimes(1);
  });
});
