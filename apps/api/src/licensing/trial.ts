import type { LabDbClient } from "../db/client.js";
import { TRIAL_DAYS } from "../config.js";
import { licenseTimeLeft, nowTs, parseTs, type LicenseRow } from "./core.js";

export type TrialRow = {
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

function addDaysTs(start: string, days: number): string {
  const d = parseTs(start) ?? new Date();
  const end = new Date(d.getTime() + days * 86_400_000);
  return end.toISOString().slice(0, 19).replace("T", " ");
}

export async function ensureMatrizTrial(db: LabDbClient, clinicaId: number): Promise<TrialRow | null> {
  const row = await db.queryOne<TrialRow>(
    "SELECT trial_started_at, trial_ends_at FROM empresa WHERE clinica_id = ?",
    [clinicaId],
  );
  if (!row) return null;
  if (row.trial_started_at) return row;

  const start = nowTs();
  const end = addDaysTs(start, TRIAL_DAYS);
  await db.run("UPDATE empresa SET trial_started_at = ?, trial_ends_at = ? WHERE clinica_id = ?", [
    start,
    end,
    clinicaId,
  ]);
  return { trial_started_at: start, trial_ends_at: end };
}

export async function ensureUnidadeTrial(
  db: LabDbClient,
  clinicaId: number,
  unidadeId: string,
): Promise<TrialRow> {
  const row = await db.queryOne<TrialRow>(
    "SELECT trial_started_at, trial_ends_at FROM empresa_unidades WHERE clinica_id = ? AND id = ?",
    [clinicaId, unidadeId],
  );
  if (!row) throw new Error("UNIDADE_NOT_FOUND");
  if (row.trial_started_at) return row;

  const start = nowTs();
  const end = addDaysTs(start, TRIAL_DAYS);
  await db.run(
    "UPDATE empresa_unidades SET trial_started_at = ?, trial_ends_at = ? WHERE clinica_id = ? AND id = ?",
    [start, end, clinicaId, unidadeId],
  );
  return { trial_started_at: start, trial_ends_at: end };
}

export async function getTrialRow(
  db: LabDbClient,
  clinicaId: number,
  unidadeId?: string | null,
): Promise<TrialRow | null> {
  if (unidadeId) {
    return (
      (await db.queryOne<TrialRow>(
        "SELECT trial_started_at, trial_ends_at FROM empresa_unidades WHERE clinica_id = ? AND id = ?",
        [clinicaId, unidadeId],
      )) ?? null
    );
  }
  return (
    (await db.queryOne<TrialRow>(
      "SELECT trial_started_at, trial_ends_at FROM empresa WHERE clinica_id = ?",
      [clinicaId],
    )) ?? null
  );
}

export function trialStatusPayload(
  trial: TrialRow,
  unidadeId?: string | null,
  unidadeNome?: string,
): Record<string, unknown> {
  const now = new Date();
  const end = parseTs(trial.trial_ends_at);
  const start = parseTs(trial.trial_started_at);
  const expired = !end || end <= now;
  const { daysLeft, hoursLeft } = licenseTimeLeft(trial.trial_ends_at, now);

  return {
    hasLicense: !expired,
    valid: !expired,
    status: expired ? "expired" : "trial",
    phase: "trial",
    produto: "lab",
    produtoLabel: "Dental Lab (standalone)",
    periodo: "trial",
    periodoLabel: `Teste (${TRIAL_DAYS} dias)`,
    startsAt: trial.trial_started_at ?? "",
    endsAt: trial.trial_ends_at ?? "",
    daysLeft: expired ? 0 : daysLeft,
    hoursLeft: expired ? 0 : hoursLeft,
    licenseKeyMasked: "",
    alertLevel: expired ? "expired" : daysLeft <= 7 ? "critical" : "info",
    alertMessage: expired
      ? `Período de teste${unidadeNome ? ` da filial ${unidadeNome}` : " da matriz"} encerrado. Insira a licença comercial.`
      : `Período de teste${unidadeNome ? ` — ${unidadeNome}` : " — matriz"}: ${daysLeft} dia(s) restantes (início ${start?.toLocaleDateString("pt-BR") ?? "—"}).`,
    unidadeId: unidadeId ?? null,
    unidadeNome: unidadeNome ?? null,
    isTrial: true,
    source: "local-trial",
  };
}

export function hasActiveCommercial(_lic: LicenseRow | null): boolean {
  return Boolean(_lic);
}
