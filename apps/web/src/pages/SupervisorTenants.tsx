import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type TenantLicenseRow, type TenantRecord } from "../api";
import { Modal } from "../components";
import {
  GERADOR_URL,
  LICENSE_PERIODOS,
  LICENSE_PRODUTOS,
  TENANT_MODE_MANUAL,
  TENANT_MODE_NEW,
  licenseStatusClass,
  suggestClienteCodigo,
  tenantLabel,
} from "../lib/licenseCatalog";
import { useSession } from "../lib/SessionContext";

export default function SupervisorTenantsPage() {
  const { perfil } = useSession();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [licenses, setLicenses] = useState<TenantLicenseRow[]>([]);
  const [tenantMode, setTenantMode] = useState<string>("");
  const [produto, setProduto] = useState("cloud");
  const [periodo, setPeriodo] = useState("trial7");
  const [clienteNome, setClienteNome] = useState("");
  const [clinicaIdInput, setClinicaIdInput] = useState("");
  const [clienteCodigo, setClienteCodigo] = useState("");
  const [formRazao, setFormRazao] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<TenantLicenseRow | null>(null);
  const [editCliente, setEditCliente] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPeriodo, setEditPeriodo] = useState("1y");

  const refreshTenants = () => api.supervisor.listTenants().then(setTenants).catch(() => setTenants([]));
  const refreshLicenses = () => api.supervisor.listAllLicenses().then(setLicenses).catch(() => setLicenses([]));

  useEffect(() => {
    refreshTenants();
    refreshLicenses();
  }, []);

  useEffect(() => {
    if (tenantMode === TENANT_MODE_NEW) {
      setClinicaIdInput("");
      if (!clienteCodigo) setClienteCodigo(suggestClienteCodigo(tenants.length + 1));
      return;
    }
    if (tenantMode === TENANT_MODE_MANUAL) {
      setClinicaIdInput("");
      setFormRazao("");
      setFormNome("");
      setFormCnpj("");
      return;
    }
    const t = tenants.find((row) => String(row.clinicaId) === tenantMode);
    if (!t) return;
    setClinicaIdInput(String(t.clinicaId));
    setClienteNome(tenantLabel(t.nomeFantasia, t.razaoSocial, t.clinicaId));
    setClienteCodigo(t.clienteCodigo ?? "");
    setFormRazao(t.razaoSocial ?? "");
    setFormNome(t.nomeFantasia ?? "");
    setFormCnpj(t.cnpj ?? "");
  }, [tenantMode, tenants]);

  if (perfil && perfil !== "supervisor") {
    return <Navigate to="/" replace />;
  }

  async function resolveClinicaId(): Promise<number> {
    if (tenantMode === TENANT_MODE_NEW) {
      if (!formRazao.trim() && !formNome.trim()) {
        throw new Error("Informe razão social ou nome fantasia para cadastrar a empresa.");
      }
      const created = await api.supervisor.createTenant({
        razaoSocial: formRazao.trim() || null,
        nomeFantasia: formNome.trim() || null,
        cnpj: formCnpj.trim() || null,
        clienteCodigo: clienteCodigo.trim() || null,
      });
      await refreshTenants();
      setTenantMode(String(created.clinicaId));
      setClinicaIdInput(String(created.clinicaId));
      return created.clinicaId;
    }

    const cid =
      tenantMode === TENANT_MODE_MANUAL ? Number(clinicaIdInput) : Number(tenantMode || clinicaIdInput);
    if (!Number.isFinite(cid) || cid <= 0) {
      throw new Error("Informe um Clínica ID válido.");
    }

    const existing = tenants.find((t) => t.clinicaId === cid);
    if (!existing) {
      throw new Error(`Tenant #${cid} não encontrado. Cadastre a empresa ou selecione um tenant provisionado.`);
    }

    await api.supervisor.updateTenant(cid, {
      nomeFantasia: formNome.trim() || null,
      razaoSocial: formRazao.trim() || null,
      cnpj: formCnpj.trim() || null,
      clienteCodigo: clienteCodigo.trim() || null,
    });
    await refreshTenants();
    return cid;
  }

  async function gerarLicenca(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setMsg("");
    try {
      const cid = await resolveClinicaId();
      const row = await api.supervisor.generateLicense(cid, {
        produto,
        periodo,
        clienteNome: clienteNome.trim() || formRazao.trim() || formNome.trim(),
        notes,
      });
      setMsg(`Licença ${row.licenseKey} gerada para tenant #${cid}.`);
      setNotes("");
      await refreshLicenses();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar licença");
    } finally {
      setLoading(false);
    }
  }

  async function copiar(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setMsg(`Chave ${key} copiada.`);
    } catch {
      setErro("Não foi possível copiar.");
    }
  }

  function openEdit(row: TenantLicenseRow) {
    setEditRow(row);
    setEditCliente(row.clienteNome);
    setEditNotes(row.notes);
    setEditPeriodo(row.periodo);
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    if (!editRow?.clinicaId) return;
    setLoading(true);
    setErro("");
    try {
      await api.supervisor.updateLicense(editRow.clinicaId, editRow.id, {
        clienteNome: editCliente,
        notes: editNotes,
        periodo: editPeriodo,
      });
      setMsg("Licença atualizada.");
      setEditRow(null);
      await refreshLicenses();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao editar");
    } finally {
      setLoading(false);
    }
  }

  async function cancelarLicenca(row: TenantLicenseRow) {
    if (!row.clinicaId) return;
    if (!window.confirm(`Cancelar a licença ${row.licenseKey}?`)) return;
    setErro("");
    try {
      await api.supervisor.cancelLicense(row.clinicaId, row.id);
      setMsg("Licença cancelada.");
      await refreshLicenses();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao cancelar");
    }
  }

  async function revogarLicenca(row: TenantLicenseRow) {
    if (!row.clinicaId) return;
    if (!window.confirm(`Revogar a licença ${row.licenseKey}? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    try {
      await api.supervisor.revokeLicense(row.clinicaId, row.id);
      setMsg("Licença revogada.");
      await refreshLicenses();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao revogar");
    }
  }

  const actionsDisabled = (status: string) => status === "revoked" || status === "cancelled";

  return (
    <>
      <div className="page-header">
        <h2>
          <span className="gerador-icon" aria-hidden>
            🔑
          </span>{" "}
          Gerador de licenças
        </h2>
      </div>
      <p className="page-desc">
        Ferramenta exclusiva da equipe de suporte/comercial. Vincule sempre ao <code>clinica_id</code> e{" "}
        <code>cliente_codigo</code> (ED-*) do tenant provisionado. Billing comercial (Stripe, revogação remota) no{" "}
        <a href={GERADOR_URL} target="_blank" rel="noreferrer">
          Gerador Inova
        </a>
        .
      </p>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card gerador-card">
        <h3 className="gerador-card-title">Gerador de licenças</h3>
        <form onSubmit={gerarLicenca} className="form-grid">
          <div className="form-group full">
            <label>Cliente provisionado (tenant)</label>
            <select
              value={tenantMode}
              onChange={(e) => setTenantMode(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              <option value={TENANT_MODE_NEW}>+ Cadastrar nova empresa</option>
              <option value={TENANT_MODE_MANUAL}>Preencher IDs manualmente</option>
              {tenants.map((t) => (
                <option key={t.clinicaId} value={t.clinicaId}>
                  #{t.clinicaId} — {tenantLabel(t.nomeFantasia, t.razaoSocial, t.clinicaId)} ({t.postgresSchema})
                </option>
              ))}
            </select>
          </div>

          {tenantMode === TENANT_MODE_NEW ? (
            <>
              <div className="form-group full">
                <label>Razão social</label>
                <input value={formRazao} onChange={(e) => setFormRazao(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Nome fantasia</label>
                <input value={formNome} onChange={(e) => setFormNome(e.target.value)} />
              </div>
              <div className="form-group">
                <label>CNPJ</label>
                <input value={formCnpj} onChange={(e) => setFormCnpj(e.target.value)} />
              </div>
            </>
          ) : null}

          <div className="form-group">
            <label>Produto</label>
            <select value={produto} onChange={(e) => setProduto(e.target.value)}>
              {LICENSE_PRODUTOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {LICENSE_PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Cliente (nome comercial)</label>
            <input
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Nome exibido na licença"
            />
          </div>
          <div className="form-group">
            <label>Clínica ID</label>
            <input
              value={clinicaIdInput}
              onChange={(e) => setClinicaIdInput(e.target.value)}
              placeholder="Ex: 2"
              readOnly={tenantMode !== TENANT_MODE_MANUAL && tenantMode !== TENANT_MODE_NEW && tenantMode !== ""}
              required={tenantMode === TENANT_MODE_MANUAL}
            />
          </div>
          <div className="form-group full">
            <label>Cliente código (ED-YYYYMMDD-NNNN)</label>
            <input
              value={clienteCodigo}
              onChange={(e) => setClienteCodigo(e.target.value)}
              placeholder="Ex: ED-20210520-0002"
            />
          </div>
          <div className="form-group full">
            <label>Observações internas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="form-actions full">
            <button type="submit" className="btn btn-primary btn-gerar" disabled={loading || !tenantMode}>
              {loading ? "Gerando…" : "+ Gerar licença"}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Licenças emitidas ({licenses.length})</h3>
        {licenses.length === 0 ? (
          <p className="muted">Nenhuma licença emitida ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table license-table">
              <thead>
                <tr>
                  <th>Chave</th>
                  <th>Cliente</th>
                  <th>Código ED</th>
                  <th>Produto</th>
                  <th>Período</th>
                  <th>Status</th>
                  <th>Clínica ID</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((r) => (
                  <tr key={`${r.clinicaId}-${r.id}`} className={actionsDisabled(r.status) ? "row-muted" : ""}>
                    <td>
                      <span className="license-key-cell">
                        <code>{r.licenseKey}</code>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Copiar chave"
                          onClick={() => void copiar(r.licenseKey)}
                        >
                          ⧉
                        </button>
                      </span>
                    </td>
                    <td>{r.clienteNome || "—"}</td>
                    <td>{r.clienteCodigo || "—"}</td>
                    <td>{r.produtoLabel}</td>
                    <td>{r.periodoLabel}</td>
                    <td>
                      <span className={licenseStatusClass(r.status)}>{r.statusLabel ?? r.status}</span>
                    </td>
                    <td>{r.clinicaId ?? "—"}</td>
                    <td>
                      <div className="license-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={actionsDisabled(r.status)}
                          onClick={() => openEdit(r)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-warn"
                          disabled={actionsDisabled(r.status) || r.status !== "pending"}
                          onClick={() => void cancelarLicenca(r)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-danger"
                          disabled={actionsDisabled(r.status)}
                          onClick={() => void revogarLicenca(r)}
                        >
                          Revogar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editRow ? (
        <Modal title={`Editar licença · ${editRow.licenseKey}`} onClose={() => setEditRow(null)}>
          <form onSubmit={salvarEdicao} className="form-grid">
            <div className="form-group full">
              <label>Cliente (nome comercial)</label>
              <input value={editCliente} onChange={(e) => setEditCliente(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Período</label>
              <select
                value={editPeriodo}
                onChange={(e) => setEditPeriodo(e.target.value)}
                disabled={editRow.status !== "pending" && editRow.status !== "active"}
              >
                {LICENSE_PERIODOS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Observações</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
            </div>
            <div className="form-actions full">
              <button type="button" className="btn btn-outline" onClick={() => setEditRow(null)}>
                Fechar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
