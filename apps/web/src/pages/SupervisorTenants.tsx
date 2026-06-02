import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type TenantLicenseRow, type TenantLicenseStatus, type TenantRecord } from "../api";
import { Modal } from "../components";
import { useSession } from "../lib/SessionContext";

const GERADOR_URL = "https://licencas.inovatitech.com.br";

const PRODUTOS = [{ value: "lab", label: "Dental Lab (standalone)" }];

const PERIODOS = [
  { value: "trial", label: "Teste (30 dias)" },
  { value: "1y", label: "1 ano" },
  { value: "2y", label: "2 anos" },
  { value: "4y", label: "4 anos" },
  { value: "5y", label: "5 anos" },
];

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  provisioning: "Provisionando",
};

function tenantLabel(t: TenantRecord) {
  return t.nomeFantasia || t.razaoSocial || `Tenant ${t.clinicaId}`;
}

export default function SupervisorTenantsPage() {
  const { perfil } = useSession();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selected, setSelected] = useState<TenantRecord | null>(null);
  const [licStatus, setLicStatus] = useState<TenantLicenseStatus | null>(null);
  const [licenses, setLicenses] = useState<TenantLicenseRow[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | "license" | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const [formNome, setFormNome] = useState("");
  const [formRazao, setFormRazao] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formClienteCodigo, setFormClienteCodigo] = useState("");
  const [formStatus, setFormStatus] = useState<TenantRecord["status"]>("active");

  const [licProduto, setLicProduto] = useState("lab");
  const [licPeriodo, setLicPeriodo] = useState("1y");
  const [licNotes, setLicNotes] = useState("");

  const refreshTenants = () =>
    api.supervisor
      .listTenants()
      .then(setTenants)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao listar tenants"));

  useEffect(() => {
    refreshTenants();
  }, []);

  async function loadTenantDetails(t: TenantRecord) {
    setSelected(t);
    setErro("");
    try {
      const [status, rows] = await Promise.all([
        api.supervisor.licenseStatus(t.clinicaId),
        api.supervisor.listLicenses(t.clinicaId),
      ]);
      setLicStatus(status);
      setLicenses(rows);
    } catch (e) {
      setLicStatus(null);
      setLicenses([]);
      setErro(e instanceof Error ? e.message : "Falha ao carregar licença");
    }
  }

  function openCreate() {
    setFormNome("");
    setFormRazao("");
    setFormCnpj("");
    setFormClienteCodigo("");
    setModal("create");
    setErro("");
  }

  function openEdit(t: TenantRecord) {
    setSelected(t);
    setFormNome(t.nomeFantasia ?? "");
    setFormRazao(t.razaoSocial ?? "");
    setFormCnpj(t.cnpj ?? "");
    setFormClienteCodigo(t.clienteCodigo ?? "");
    setFormStatus(t.status);
    setModal("edit");
    setErro("");
  }

  async function saveCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const created = await api.supervisor.createTenant({
        nomeFantasia: formNome.trim() || null,
        razaoSocial: formRazao.trim() || null,
        cnpj: formCnpj.trim() || null,
        clienteCodigo: formClienteCodigo.trim() || null,
      });
      setMsg(`Tenant #${created.clinicaId} criado (${created.postgresSchema}).`);
      setModal(null);
      await refreshTenants();
      await loadTenantDetails(created);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar tenant");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setErro("");
    try {
      const updated = await api.supervisor.updateTenant(selected.clinicaId, {
        nomeFantasia: formNome.trim() || null,
        razaoSocial: formRazao.trim() || null,
        cnpj: formCnpj.trim() || null,
        clienteCodigo: formClienteCodigo.trim() || null,
        status: formStatus,
      });
      setMsg(`Tenant #${updated.clinicaId} atualizado.`);
      setModal(null);
      await refreshTenants();
      await loadTenantDetails(updated);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar tenant");
    } finally {
      setLoading(false);
    }
  }

  async function gerarLicenca(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setErro("");
    try {
      const row = await api.supervisor.generateLicense(selected.clinicaId, {
        produto: licProduto,
        periodo: licPeriodo,
        clienteNome: tenantLabel(selected),
        notes: licNotes,
      });
      setMsg(`Chave gerada no schema do tenant: ${row.licenseKey}`);
      setModal(null);
      await loadTenantDetails(selected);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar licença");
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

  const remote = licStatus?.remoteStatus;
  const local = licStatus?.localStatus;

  if (perfil && perfil !== "supervisor") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="page-header">
        <h2>Supervisor · Empresas (tenants)</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Nova empresa
        </button>
      </div>

      <p className="page-desc">
        Gerencie clientes Lab na VPS (schema Postgres por tenant). Licenças comerciais completas (Stripe,
        revogação) ficam no{" "}
        <a href={GERADOR_URL} target="_blank" rel="noreferrer">
          Gerador Inova
        </a>
        . Aqui você consulta status remoto, gera chaves no schema do tenant e vincula{" "}
        <code>cliente_codigo</code> comercial.
      </p>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="supervisor-layout">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Tenants ({tenants.length})</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Lab</th>
                  <th>Empresa</th>
                  <th>Schema</th>
                  <th>Cód. comercial</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.clinicaId} className={selected?.clinicaId === t.clinicaId ? "row-selected" : ""}>
                    <td>{t.clinicaId}</td>
                    <td>{tenantLabel(t)}</td>
                    <td>
                      <code>{t.postgresSchema}</code>
                    </td>
                    <td>{t.clienteCodigo || "—"}</td>
                    <td>
                      <span className={`badge badge-${t.status === "active" ? "ok" : "warn"}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => loadTenantDetails(t)}>
                        Detalhes
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected ? (
          <div className="card supervisor-detail">
            <h3>
              {tenantLabel(selected)} <small>#{selected.clinicaId}</small>
            </h3>
            <p className="page-desc" style={{ marginTop: 8 }}>
              Schema: <code>{selected.postgresSchema}</code>
              {selected.cnpj ? ` · CNPJ ${selected.cnpj}` : ""}
            </p>

            <div className="supervisor-status-grid">
              <div className="status-box">
                <h4>Licença local / trial</h4>
                <p>{String(local?.status ?? local?.phase ?? "—")}</p>
                {local?.alertMessage ? <p className="muted">{String(local.alertMessage)}</p> : null}
                {local?.daysLeft != null ? <p>{String(local.daysLeft)} dias restantes</p> : null}
              </div>
              <div className="status-box">
                <h4>Gerador remoto</h4>
                {licStatus?.remoteEnabled ? (
                  licStatus.remoteError ? (
                    <p className="muted">{licStatus.remoteError}</p>
                  ) : (
                    <>
                      <p>{String(remote?.status ?? (remote?.valid ? "ativa" : "sem licença"))}</p>
                      {remote?.daysRemaining != null ? <p>{String(remote.daysRemaining)} dias</p> : null}
                    </>
                  )
                ) : (
                  <p className="muted">Remoto não configurado (env LICENSE_SERVER)</p>
                )}
                <a href={licStatus?.geradorUrl ?? GERADOR_URL} target="_blank" rel="noreferrer">
                  Abrir Gerador
                </a>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal("license")}>
                Gerar chave (tenant)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => loadTenantDetails(selected)}>
                Atualizar
              </button>
            </div>

            <h4 style={{ marginBottom: 8 }}>Chaves no schema ({licenses.length})</h4>
            {licenses.length === 0 ? (
              <p className="muted">Nenhuma chave neste tenant.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Chave</th>
                      <th>Período</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <code>{r.licenseKey}</code>
                        </td>
                        <td>{r.periodoLabel}</td>
                        <td>{r.status}</td>
                        <td>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => copiar(r.licenseKey)}>
                            Copiar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="card supervisor-detail muted">
            Selecione um tenant para ver licença e chaves.
          </div>
        )}
      </div>

      {modal === "create" ? (
        <Modal title="Nova empresa (tenant)" onClose={() => setModal(null)}>
          <form onSubmit={saveCreate} className="form-grid">
            <div className="form-group full">
              <label>Razão social</label>
              <input value={formRazao} onChange={(e) => setFormRazao(e.target.value)} required />
            </div>
            <div className="form-group full">
              <label>Nome fantasia</label>
              <input value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div className="form-group">
              <label>CNPJ</label>
              <input value={formCnpj} onChange={(e) => setFormCnpj(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Código cliente comercial</label>
              <input
                value={formClienteCodigo}
                onChange={(e) => setFormClienteCodigo(e.target.value)}
                placeholder="Gerador / ERP"
              />
            </div>
            <div className="form-actions full">
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Criando…" : "Criar tenant"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "edit" && selected ? (
        <Modal title={`Editar tenant #${selected.clinicaId}`} onClose={() => setModal(null)}>
          <form onSubmit={saveEdit} className="form-grid">
            <div className="form-group full">
              <label>Razão social</label>
              <input value={formRazao} onChange={(e) => setFormRazao(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Nome fantasia</label>
              <input value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div className="form-group">
              <label>CNPJ</label>
              <input value={formCnpj} onChange={(e) => setFormCnpj(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Código cliente comercial</label>
              <input value={formClienteCodigo} onChange={(e) => setFormClienteCodigo(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as TenantRecord["status"])}>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
            <div className="form-actions full">
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "license" && selected ? (
        <Modal title={`Gerar licença · tenant #${selected.clinicaId}`} onClose={() => setModal(null)}>
          <p className="page-desc" style={{ marginBottom: 12 }}>
            Gera chave pendente no schema <code>{selected.postgresSchema}</code>. Para billing comercial use o Gerador
            Inova.
          </p>
          <form onSubmit={gerarLicenca} className="form-grid">
            <div className="form-group">
              <label>Produto</label>
              <select value={licProduto} onChange={(e) => setLicProduto(e.target.value)}>
                {PRODUTOS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Período</label>
              <select value={licPeriodo} onChange={(e) => setLicPeriodo(e.target.value)}>
                {PERIODOS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Observações</label>
              <input value={licNotes} onChange={(e) => setLicNotes(e.target.value)} />
            </div>
            <div className="form-actions full">
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Gerando…" : "Gerar chave"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
