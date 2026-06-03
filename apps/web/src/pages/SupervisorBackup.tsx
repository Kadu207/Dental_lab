import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type TenantBackupLogRecord, type TenantRecord } from "../api";
import { ActionButton } from "../components/ui/ActionButton";
import { IconDatabase, IconDownload, IconPlus } from "../components/ui/Icons";
import { PageHeader } from "../components/ui/PageHeader";
import { downloadWithAuth } from "../lib/downloadWithAuth";
import { canAccessSupervisorConsole } from "../lib/auth";
import { useSession } from "../lib/SessionContext";

function tenantLabel(t: TenantRecord) {
  return t.nomeFantasia || t.razaoSocial || `Tenant ${t.clinicaId}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function SupervisorBackupPage() {
  const { perfil } = useSession();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [history, setHistory] = useState<TenantBackupLogRecord[]>([]);
  const [clinicaId, setClinicaId] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    api.supervisor.listBackupHistory().then(setHistory).catch(() => setHistory([]));
  };

  useEffect(() => {
    api.supervisor.listTenants().then((rows) => {
      setTenants(rows);
      if (rows.length > 0 && !clinicaId) setClinicaId(String(rows[0].clinicaId));
    });
    refresh();
  }, []);

  if (perfil && !canAccessSupervisorConsole(perfil)) {
    return <Navigate to="/" replace />;
  }

  async function gerarBackup(e: FormEvent) {
    e.preventDefault();
    const cid = Number(clinicaId);
    if (!Number.isFinite(cid) || cid <= 0) {
      setErro("Selecione uma empresa.");
      return;
    }
    setLoading(true);
    setErro("");
    setMsg("");
    try {
      const qs = notes.trim() ? `?notes=${encodeURIComponent(notes.trim())}` : "";
      await downloadWithAuth(`${api.supervisor.exportBackupUrl(cid)}${qs}`, {
        filename: `dental-lab-tenant-${cid}.json`,
      });
      setMsg(`Backup da empresa #${cid} gerado e baixado.`);
      setNotes("");
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar backup");
    } finally {
      setLoading(false);
    }
  }

  async function baixarNovamente(row: TenantBackupLogRecord) {
    setErro("");
    try {
      await downloadWithAuth(api.supervisor.exportBackupUrl(row.clinicaId), {
        filename: row.filename,
      });
      setMsg(`Backup reexportado: ${row.filename}`);
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao baixar");
    }
  }

  const selected = tenants.find((t) => String(t.clinicaId) === clinicaId);

  return (
    <>
      <PageHeader
        title="Backup de empresas"
        subtitle="Gera backup lógico JSON por empresa (clinica_id): pacientes, próteses, estoque, usuários e licenças do schema Postgres."
        icon={<IconDatabase size={22} />}
      />

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ maxWidth: 900 }}>
        <h3 style={{ marginBottom: 12 }}>Gerar backup</h3>
        <form onSubmit={gerarBackup} className="form-grid">
          <div className="form-group full">
            <label>Cliente provisionado (tenant)</label>
            <select value={clinicaId} onChange={(e) => setClinicaId(e.target.value)} required>
              <option value="">Selecione…</option>
              {tenants.map((t) => (
                <option key={t.clinicaId} value={t.clinicaId}>
                  #{t.clinicaId} — {tenantLabel(t)} ({t.postgresSchema})
                </option>
              ))}
            </select>
          </div>
          {selected ? (
            <>
              <div className="form-group">
                <label>Clínica ID (Lab)</label>
                <input value={selected.clinicaId} readOnly />
              </div>
              <div className="form-group">
                <label>Schema Postgres</label>
                <input value={selected.postgresSchema} readOnly />
              </div>
              <div className="form-group">
                <label>Código comercial</label>
                <input value={selected.clienteCodigo ?? "—"} readOnly />
              </div>
            </>
          ) : null}
          <div className="form-group full">
            <label>Observações internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: backup pré-migração, cliente solicitou cópia…"
            />
          </div>
          <div className="form-actions full">
            <ActionButton
              type="submit"
              variant="primary"
              icon={<IconPlus size={16} />}
              disabled={loading || !clinicaId}
            >
              {loading ? "Gerando…" : "Gerar backup JSON"}
            </ActionButton>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Backups emitidos ({history.length})</h3>
        {history.length === 0 ? (
          <p className="muted">Nenhum backup registrado ainda. Gere o primeiro acima.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Empresa</th>
                  <th>Clínica ID</th>
                  <th>Schema</th>
                  <th>Registros</th>
                  <th>Arquivo</th>
                  <th>Obs.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>{r.nomeFantasia || r.razaoSocial || "—"}</td>
                    <td>{r.clinicaId}</td>
                    <td>
                      <code>{r.postgresSchema}</code>
                    </td>
                    <td>{r.rowCount}</td>
                    <td>
                      <code>{r.filename}</code>
                    </td>
                    <td className="muted">{r.notes || "—"}</td>
                    <td>
                      <ActionButton
                        variant="outline"
                        size="sm"
                        icon={<IconDownload size={14} />}
                        onClick={() => void baixarNovamente(r)}
                      >
                        Baixar
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
