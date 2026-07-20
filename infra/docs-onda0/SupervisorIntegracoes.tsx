import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type IntegracoesStatus } from "../api";
import { ActionButton } from "../components/ui/ActionButton";
import { PageHeader } from "../components/ui/PageHeader";
import { canAccessSupervisorConsole } from "../lib/auth";
import { useSession } from "../lib/SessionContext";

export default function SupervisorIntegracoesPage() {
  const { perfil, loading: sessionLoading } = useSession();
  const [status, setStatus] = useState<IntegracoesStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api.integracoes
      .status()
      .then(setStatus)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar status"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!sessionLoading && perfil && !canAccessSupervisorConsole(perfil)) {
    return <Navigate to="/" replace />;
  }

  async function disparar(canal: "n8n" | "chatwoot") {
    setBusy(true);
    setErro("");
    setMsg("");
    try {
      const r =
        canal === "n8n"
          ? await api.integracoes.dispararN8n({ type: "manual_test", data: { note: "teste supervisor" } })
          : await api.integracoes.enviarChatwoot({ type: "manual_test", data: { note: "teste supervisor" } });
      setMsg(r.msg);
      refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no disparo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Integrações Chatwoot / N8N" subtitle="Status e disparo manual (standalone)" />

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ maxWidth: 720 }}>
        {!status ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <dl className="integracoes-status-dl">
              <div>
                <dt>Flag INTEGRATIONS_ENABLED</dt>
                <dd>{status.enabled ? "sim" : "não"}</dd>
              </div>
              <div>
                <dt>Vai emitir eventos</dt>
                <dd>{status.willEmit ? "sim" : "não"}</dd>
              </div>
              <div>
                <dt>Modo</dt>
                <dd>{status.deploymentMode}</dd>
              </div>
              <div>
                <dt>Forçar em embedded</dt>
                <dd>{status.forceInEmbedded ? "sim" : "não"}</dd>
              </div>
              <div>
                <dt>N8N</dt>
                <dd>
                  {status.n8n.configured ? status.n8n.url : "não configurado"}
                  {status.n8n.hasSecret ? " · secret OK" : " · sem secret"}
                </dd>
              </div>
              <div>
                <dt>Chatwoot</dt>
                <dd>
                  {status.chatwoot.configured ? status.chatwoot.url : "não configurado"}
                  {status.chatwoot.hasSecret ? " · secret OK" : " · sem secret"}
                </dd>
              </div>
            </dl>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <ActionButton variant="primary" type="button" disabled={busy} onClick={() => void disparar("n8n")}>
                Testar N8N
              </ActionButton>
              <ActionButton variant="outline" type="button" disabled={busy} onClick={() => void disparar("chatwoot")}>
                Testar Chatwoot
              </ActionButton>
              <ActionButton variant="ghost" type="button" disabled={busy} onClick={refresh}>
                Atualizar status
              </ActionButton>
            </div>

            <p className="muted" style={{ fontSize: "0.85rem", marginTop: 16 }}>
              Em modo embedded o Lab não emite por padrão (CRM no Excellence). Configure{" "}
              <code>INTEGRATIONS_FORCE_IN_EMBEDDED=true</code> só se necessário. Ver{" "}
              <code>docs/INTEGRACOES-CHATWOOT-N8N.md</code>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
