import { useEffect, useState } from "react";
import { api } from "../api";

export const LICENSE_KEY_LEN = 25;

export function normalizeLicenseKey(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, LICENSE_KEY_LEN);
}

export function isValidLicenseKeyInput(value: string): boolean {
  const n = normalizeLicenseKey(value);
  return n.length === LICENSE_KEY_LEN && /^[A-Z0-9]+$/.test(n);
}

const ERRO_MSG: Record<string, string> = {
  INVALID_LICENSE_KEY: "A chave deve conter exatamente 25 caracteres alfanuméricos (A–Z, 0–9).",
  LICENSE_NOT_FOUND: "Chave não encontrada. Verifique se digitou corretamente ou contate o suporte.",
  LICENSE_REVOKED: "Esta licença foi revogada. Contate o suporte comercial.",
  LICENSE_ALREADY_USED: "Esta licença já está vinculada a outra clínica ou unidade.",
  LICENSE_SCOPE_MISMATCH: "Esta licença não pertence a esta unidade.",
  LICENSE_ACTIVATION_FAILED: "Não foi possível ativar a licença. Tente novamente.",
  NO_SERVER: "Servidor de licenças remoto não configurado.",
};

function formatLicenseError(err: unknown): string {
  if (!(err instanceof Error)) return "Falha ao ativar a licença";
  const msg = err.message.trim();
  return ERRO_MSG[msg] ?? msg;
}

type LicencaStatus = {
  hasLicense?: boolean;
  valid?: boolean;
  status?: string;
  isTrial?: boolean;
  produtoLabel?: string;
  periodoLabel?: string;
  startsAt?: string;
  endsAt?: string;
  daysLeft?: number;
  licenseKeyMasked?: string;
  alertMessage?: string;
  alertLevel?: string;
  remoteEnabled?: boolean;
  source?: string;
  unidadeNome?: string;
};

function fmtDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

type Props = {
  unidadeId?: string | null;
  unidadeNome?: string;
  heading?: string;
};

export function LicencaLabSection({ unidadeId = null, unidadeNome, heading }: Props) {
  const [status, setStatus] = useState<LicencaStatus | null>(null);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = () =>
    api.licencas.status(unidadeId).then(setStatus).catch(() => setStatus(null));

  useEffect(() => {
    refresh();
  }, [unidadeId]);

  const normalized = normalizeLicenseKey(key);
  const valid = isValidLicenseKeyInput(key);
  const label = heading ?? (unidadeId ? `Licença — ${unidadeNome ?? "Filial"}` : "Licença — Matriz");

  const ativar = async () => {
    setErro("");
    setMsg("");
    if (!valid) {
      setErro(ERRO_MSG.INVALID_LICENSE_KEY);
      return;
    }
    setLoading(true);
    try {
      await api.licencas.activate(normalized, unidadeId);
      setMsg("Licença validada remotamente e ativada com sucesso.");
      setKey("");
      await refresh();
    } catch (e) {
      setErro(formatLicenseError(e));
    } finally {
      setLoading(false);
    }
  };

  const active = Boolean(status?.hasLicense || status?.valid);
  const isTrial = Boolean(status?.isTrial);

  return (
    <div className="license-section">
      <h4 className="license-unit-title">{label}</h4>

      {status?.remoteEnabled === false ? (
        <p className="license-key-hint" style={{ marginBottom: 8 }}>
          Modo local — configure DENTAL_LAB_LICENSE_SERVER_URL para validação remota (Gerador de Licenças).
        </p>
      ) : status?.remoteEnabled ? (
        <p className="license-key-hint" style={{ marginBottom: 8 }}>
          Validação online via servidor de licenças ({status.source ?? "remoto"}).
        </p>
      ) : null}

      {active ? (
        <div className={`license-status-box ${isTrial ? "license-status-pending" : "license-status-active"}`}>
          <div className="license-status-head">
            <span className={`badge ${isTrial ? "badge-recebido" : "badge-pronto"}`}>
              {isTrial ? "Período de teste" : "Licença comercial ativa"}
            </span>
            {status?.licenseKeyMasked ? (
              <code className="license-masked">{status.licenseKeyMasked}</code>
            ) : null}
          </div>
          <p>
            <strong>{String(status?.produtoLabel ?? "Dental Lab")}</strong>
            {status?.periodoLabel ? ` · ${status.periodoLabel}` : ""}
          </p>
          <ul className="license-dates">
            <li>
              <span>Início</span>
              <strong>{fmtDate(status?.startsAt)}</strong>
            </li>
            <li>
              <span>Término</span>
              <strong>{fmtDate(status?.endsAt)}</strong>
            </li>
            {typeof status?.daysLeft === "number" && status.daysLeft > 0 ? (
              <li>
                <span>Restante</span>
                <strong>{status.daysLeft} dia(s)</strong>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <div className="license-status-box license-status-pending">
          <span className="badge badge-recebido">Sem licença ativa</span>
          <p>
            {unidadeId
              ? "Cada filial possui licença própria. Após o teste de 30 dias, insira a chave comercial desta unidade."
              : "A matriz possui licença própria. Salve o cadastro da empresa para iniciar 30 dias de teste ou insira a chave comercial."}
          </p>
        </div>
      )}

      {status?.alertMessage && status.alertLevel && status.alertLevel !== "none" ? (
        <div
          className={`alert ${status.alertLevel === "expired" ? "alert-error" : "alert-warning"}`}
          style={{ marginTop: 12 }}
        >
          {status.alertMessage}
        </div>
      ) : null}

      <div className="form-group full" style={{ marginTop: 16 }}>
        <label htmlFor={`license-key-${unidadeId ?? "matriz"}`}>
          Chave de licença (25 caracteres alfanuméricos)
        </label>
        <input
          id={`license-key-${unidadeId ?? "matriz"}`}
          value={key}
          onChange={(e) => setKey(normalizeLicenseKey(e.target.value))}
          placeholder="Ex: AB12CD34EF56GH78IJ90KL12M"
          maxLength={LICENSE_KEY_LEN}
          className="license-key-input"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="license-key-meta">
          <span className="license-key-hint">Validada online no Gerador de Licenças ao ativar.</span>
          <span className={`license-key-counter${valid ? " valid" : ""}`}>
            {normalized.length}/{LICENSE_KEY_LEN}
          </span>
        </div>
      </div>

      <button type="button" className="btn btn-primary" disabled={!valid || loading} onClick={ativar}>
        {loading ? "Validando online…" : "Validar e ativar licença"}
      </button>

      {msg ? <div className="alert alert-success" style={{ marginTop: 12 }}>{msg}</div> : null}
      {erro ? <div className="alert alert-error" style={{ marginTop: 12 }}>{erro}</div> : null}
    </div>
  );
}
