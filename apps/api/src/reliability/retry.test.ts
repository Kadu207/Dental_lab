import { describe, expect, it } from "vitest";
import { isRetryableStatus, isTransientNetworkError, retryDelayMs, RetryableHttpError, withRetry } from "./retry.js";

describe("retry", () => {
  it("aplica backoff com jitter", () => {
    expect(retryDelayMs(0, 400, 5_000, () => 0)).toBe(200);
    expect(retryDelayMs(1, 400, 5_000, () => 0)).toBe(400);
    expect(retryDelayMs(0, 400, 5_000, () => 1)).toBe(400);
  });

  it("reconhece status e erro de rede transitórios", () => {
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    const reset = Object.assign(new Error("reset"), { code: "ECONNRESET" });
    expect(isTransientNetworkError(reset)).toBe(true);
    expect(isTransientNetworkError(new Error("bug"))).toBe(false);
  });

  it("repete só falhas transitórias e devolve o sucesso", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new RetryableHttpError(503, "indisponível");
        return "ok";
      },
      {
        maxAttempts: 3,
        baseMs: 100,
        shouldRetry: (error) => error instanceof RetryableHttpError,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        random: () => 0,
      },
    );
    expect(value).toBe("ok");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([50, 100]);
  });

  it("não repete erro definitivo", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("validação");
        },
        {
          maxAttempts: 3,
          baseMs: 10,
          shouldRetry: () => false,
          sleep: async () => undefined,
        },
      ),
    ).rejects.toThrow("validação");
    expect(calls).toBe(1);
  });
});
