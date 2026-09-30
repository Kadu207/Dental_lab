import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { claimIdempotencyKey, hashPayload, resolveIdempotencyKey } from "./idempotency.js";
import { applySqliteIdempotencyStore } from "../search/fts-schema.js";

describe("idempotência", () => {
  it("prefere a chave do header e cai no hash do corpo", () => {
    const body = { type: "pedido", id: "event-1234" };
    expect(resolveIdempotencyKey({ "idempotency-key": "chave-estavel" }, body).key).toBe("chave-estavel");
    expect(resolveIdempotencyKey({}, body).key).toBe("event-1234");
    const hashed = resolveIdempotencyKey({ "idempotency-key": "%'; drop" }, { type: "x" });
    expect(hashed.key).toBe(`sha256:${hashPayload({ type: "x" })}`);
    expect(hashed.eventType).toBe("x");
    expect(resolveIdempotencyKey({}, { type: "a b" }).eventType).toBe("unknown");
  });

  it("deduplica a mesma chave no SQLite", async () => {
    const db = new Database(":memory:");
    applySqliteIdempotencyStore(db);
    const exec = {
      driver: "sqlite" as const,
      run: async (sql: string, params: unknown[]) => {
        const info = db.prepare(sql).run(...(params as never[]));
        return { changes: info.changes };
      },
    };
    const input = {
      channel: "n8n",
      idempotencyKey: "event-1234",
      eventType: "pedido",
      payloadHash: "abc",
    };
    expect(await claimIdempotencyKey(exec, input)).toBe("new");
    expect(await claimIdempotencyKey(exec, input)).toBe("duplicate");
    expect(await claimIdempotencyKey(exec, { ...input, idempotencyKey: "event-9999" })).toBe("new");
  });
});
