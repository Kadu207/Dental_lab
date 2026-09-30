export class RetryableHttpError extends Error {
  readonly name = "RetryableHttpError";

  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`HTTP ${status}`);
  }
}

export function retryDelayMs(
  attempt: number,
  baseMs: number,
  maxMs = 5_000,
  random: () => number = Math.random,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = 0.5 + random() * 0.5;
  return Math.round(exp * jitter);
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

export function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  const code = (err as NodeJS.ErrnoException).code;
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND" ||
    code === "EPIPE"
  );
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    baseMs: number;
    maxMs?: number;
    shouldRetry: (error: unknown) => boolean;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
  },
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const attempts = Math.max(1, options.maxAttempts);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts - 1 && options.shouldRetry(error);
      if (!canRetry) break;
      await sleep(retryDelayMs(attempt, options.baseMs, options.maxMs ?? 5_000, random));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("RETRY_EXHAUSTED");
}
