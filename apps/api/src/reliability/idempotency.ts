import { createHash, randomUUID } from "crypto";
import type { IncomingHttpHeaders } from "http";
import { POSTGRES_SCHEMA } from "../config.js";
import { getPgPool, getSqliteDb } from "../db/pool.js";
import { assertSqlIdent } from "../search/fts-schema.js";

const KEY_RE = /^[A-Za-z0-9._:-]{8,200}$/;

export type IdempotencyClaim = "new" | "duplicate";

type IdempotencyExecutor = {
  driver: "sqlite" | "postgres";
  run(
    sql: string,
    params: unknown[],
  ): Promise<{ changes: number; rows?: { id: string }[] }>;
};

function firstHeader(headers: IncomingHttpHeaders, name: string): string {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return String(direct[0] ?? "").trim();
  if (typeof direct === "string") return direct.trim();
  return "";
}

function sanitizeEventType(body: unknown): string {
  if (!body || typeof body !== "object" || !("type" in body)) return "unknown";
  const raw = (body as { type?: unknown }).type;
  if (typeof raw !== "string") return "unknown";
  const cleaned = raw.trim().slice(0, 80);
  if (!/^[A-Za-z0-9._:-]+$/.test(cleaned)) return "unknown";
  return cleaned;
}

export function hashPayload(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

export function resolveIdempotencyKey(
  headers: IncomingHttpHeaders,
  body: unknown,
): { key: string; eventType: string; payloadHash: string } {
  const payloadHash = hashPayload(body);
  const eventType = sanitizeEventType(body);
  const header = firstHeader(headers, "idempotency-key") || firstHeader(headers, "x-idempotency-key");
  if (KEY_RE.test(header)) return { key: header, eventType, payloadHash };

  const record = body && typeof body === "object" ? (body as { id?: unknown; event_id?: unknown }) : undefined;
  const bodyId = record?.id ?? record?.event_id;
  if (typeof bodyId === "string" && KEY_RE.test(bodyId.trim())) {
    return { key: bodyId.trim(), eventType, payloadHash };
  }

  return { key: `sha256:${payloadHash}`, eventType, payloadHash };
}

export async function claimIdempotencyKey(
  exec: IdempotencyExecutor,
  input: { channel: string; idempotencyKey: string; eventType: string; payloadHash: string },
): Promise<IdempotencyClaim> {
  const id = randomUUID();
  if (exec.driver === "sqlite") {
    const result = await exec.run(
      `INSERT OR IGNORE INTO integration_events
        (id, channel, direction, idempotency_key, event_type, payload_hash, status)
       VALUES (?, ?, 'inbound', ?, ?, ?, 'processed')`,
      [id, input.channel, input.idempotencyKey, input.eventType, input.payloadHash],
    );
    return result.changes > 0 ? "new" : "duplicate";
  }

  const table = `${assertSqlIdent(POSTGRES_SCHEMA)}.integration_events`;
  const result = await exec.run(
    `INSERT INTO ${table}
      (id, channel, direction, idempotency_key, event_type, payload_hash, status)
     VALUES ($1, $2, 'inbound', $3, $4, $5, 'processed')
     ON CONFLICT (direction, channel, idempotency_key) DO NOTHING
     RETURNING id`,
    [id, input.channel, input.idempotencyKey, input.eventType, input.payloadHash],
  );
  return (result.rows?.length ?? 0) > 0 ? "new" : "duplicate";
}

export async function claimInboundWebhook(input: {
  channel: string;
  idempotencyKey: string;
  eventType: string;
  payloadHash: string;
}): Promise<IdempotencyClaim> {
  const sqlite = getSqliteDb();
  if (sqlite) {
    return claimIdempotencyKey(
      {
        driver: "sqlite",
        run: async (sql, params) => {
          const info = sqlite.prepare(sql).run(...params);
          return { changes: info.changes };
        },
      },
      input,
    );
  }

  const pool = getPgPool();
  if (!pool) {
    throw new Error("DB_UNAVAILABLE");
  }

  return claimIdempotencyKey(
    {
      driver: "postgres",
      run: async (sql, params) => {
        const r = await pool.query<{ id: string }>(sql, params);
        return { changes: r.rowCount ?? 0, rows: r.rows };
      },
    },
    input,
  );
}
