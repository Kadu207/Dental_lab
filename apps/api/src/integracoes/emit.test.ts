import { describe, expect, it } from "vitest";
import { signBodyHmac, verifyBodyHmac, verifyWebhookSecret } from "./emit.js";

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
});
