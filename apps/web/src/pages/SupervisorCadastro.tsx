import { FormEvent, useCallback, useEffect, useState } from "react";
import { Navigate, NavLink } from "react-router-dom";
import { api, type TenantOverview, type TenantRecord } from "../api";
import { ActionButton } from "../components/ui/ActionButton";
import {
  IconCheck,
  IconEdit,
  IconKey,
  IconPause,
  IconPlus,
  IconSave,
  IconTrash,
  IconUsers,
} from "../components/ui/Icons";
import { PageHeader } from "../components/ui/PageHeader";
import { applyMask, type MaskKind } from "../lib/inputMasks";
import { licenseStatusClass } from "../lib/licenseCatalog";
import { fetchViaCep } from "../lib/viacep";
import { useSession } from "../lib/SessionContext";

type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  cpf: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone1: "",
  telefone2: "",
  whatsapp: "",
  email1: "",
  email2: "",
  responsavelNome: "",
  responsavelContato: "",
  responsavelWhatsapp: "",
  responsavelEmail: "",
  instagram: "",
  facebook: "",
  excellenceClinicaId: "",
  clienteCodigo: "",
};

type FieldDef = {
  name: keyof FormState;
  label: string;
  full?: boolean;
  mask?: MaskKind;
  type?: string;
};

const FIELDS: FieldDef[] = [
  { name: "razaoSocial", label: "Razão Social", full: true },
  { name: "nomeFantasia", label: "Nome Fantasia", full: true },
  { name: "cnpj", label: "CNPJ", mask: "cnpj" },
  { name: "cpf", label: "CPF", mask: "cpf" },
  { name: "inscricaoEstadual", label: "Inscrição Estadual" },
  { name: "inscricaoMunicipal", label: "Inscrição Municipal" },
  { name: "cep", label: "CEP (ViaCEP)", mask: "cep" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "numero", label: "Número" },
  { name: "complemento", label: "Complemento" },
  { name: "bairro", label: "Bairro" },
  { name: "cidade", label: "Cidade" },
  { name: "uf", label: "UF", mask: "uf" },
  { name: "telefone1", label: "Telefone 01", mask: "phone" },
  { name: "telefone2", label: "Telefone 02", mask: "phone" },
  { name: "whatsapp", label: "WhatsApp", mask: "phone" },
  { name: "email1", label: "Email 01", type: "email" },
  { name: "email2", label: "Email 02", type: "email" },
  { name: "responsavelNome", label: "Nome do Responsável", full: true },
  { name: "responsavelContato", label: "Contato do Responsável", mask: "phone" },
  { name: "responsavelWhatsapp", label: "WhatsApp do Responsável", mask: "phone" },
  { name: "responsavelEmail", label: "Email do Responsável", type: "email" },
  { name: "instagram", label: "Instagram" },
  { name: "facebook", label: "Facebook" },
  { name: "excellenceClinicaId", label: "Vínculo — ID Excellence Dental Cloud" },
  { name: "clienteCodigo", label: "Código comercial (ED-YYYYMMDD-NNNN)", full: true },
];

function tenantDisplayName(t: TenantOverview) {
  return t.nomeFantasia || t.razaoSocial || `Empresa #${t.clinicaId}`;
}

function tenantToForm(t: TenantRecord): FormState {
  const form: FormState = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM) as (keyof FormState)[]) {
    const val = t[key as keyof TenantRecord];
    form[key] = val == null ? "" : String(val);
  }
  return form;
}

function formToPayload(form: FormState): Partial<TenantRecord> {
  const out: Record<string, string | number | null> = {};
  for (const [key, val] of Object.entries(form)) {
    const trimmed = val.trim();
    if (key === "excellenceClinicaId") {
      out.excellenceClinicaId = trimmed ? Number(trimmed) : null;
    } else {
      out[key] = trimmed || null;
    }
  }
  return out as Partial<TenantRecord>;
}

function tenantStatusBadge(status: TenantRecord["status"]) {
  if (status === "active") return <span className="badge badge-ok">Ativo</span>;
  if (status === "suspended") return <span className="badge badge-warn">Suspenso</span>;
  return <span className="badge badge-warn">{status}</span>;
}

export default function SupervisorCadastroPage() {
  const { perfil } = useSession();
  const [rows, setRows] = useState<TenantOverview[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const refresh = useCallback(() => {
    api.supervisor.listTenantsOverview().then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (perfil && perfil !== "supervisor") {
    return <Navigate to="/" replace />;
  }

  function setField(name: keyof FormState, value: string, mask?: MaskKind) {
    setForm((prev) => ({ ...prev, [name]: mask ? applyMask(mask, value) : value }));
  }

  async function onCepBlur() {
    const cep = form.cep;
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    try {
      const data = await fetchViaCep(cep);
      if (!data) {
        setErro("CEP não encontrado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
        complemento: prev.complemento || data.complemento || "",
      }));
    } finally {
      setCepLoading(false);
    }
  }

  function novo() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setErro("");
    setMsg("");
  }

  function editar(row: TenantOverview) {
    setEditingId(row.clinicaId);
    setForm(tenantToForm(row));
    setErro("");
    setMsg(`Editando empresa #${row.clinicaId}`);
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.clinicaId)) : new Set());
  }

  const selectedIds = [...selected];

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.razaoSocial.trim() && !form.nomeFantasia.trim()) {
      setErro("Informe Razão Social ou Nome Fantasia.");
      return;
    }
    setLoading(true);
    setErro("");
    setMsg("");
    try {
      const payload = formToPayload(form);
      if (editingId) {
        const updated = await api.supervisor.updateTenant(editingId, payload);
        setMsg(`Empresa #${updated.clinicaId} atualizada.`);
        setEditingId(updated.clinicaId);
      } else {
        const created = await api.supervisor.createTenant(payload);
        setMsg(`Empresa cadastrada — ID Lab #${created.clinicaId} (schema ${created.postgresSchema}).`);
        setEditingId(created.clinicaId);
      }
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function ativar(ids: number[]) {
    if (ids.length === 0) return;
    setErro("");
    try {
      const r = await api.supervisor.bulkTenantStatus(ids, "active");
      setMsg(r.msg);
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao ativar");
    }
  }

  async function suspender(ids: number[]) {
    if (ids.length === 0) return;
    if (ids.includes(1)) {
      setErro("Não é possível suspender o tenant padrão (#1).");
      return;
    }
    if (!window.confirm(`Suspender ${ids.length} empresa(s)?`)) return;
    setErro("");
    try {
      const r = await api.supervisor.bulkTenantStatus(ids, "suspended");
      setMsg(r.msg);
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao suspender");
    }
  }

  async function remover(ids: number[]) {
    const safe = ids.filter((id) => id > 1);
    if (safe.length === 0) {
      setErro("Selecione empresas além do tenant padrão (#1).");
      return;
    }
    if (!window.confirm(`Remover ${safe.length} empresa(s) do cadastro? O schema Postgres não será apagado.`)) return;
    setErro("");
    try {
      for (const id of safe) {
        await api.supervisor.deleteTenant(id);
      }
      setSelected(new Set());
      if (editingId && safe.includes(editingId)) novo();
      setMsg(`${safe.length} empresa(s) removida(s).`);
      refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  return (
    <>
      <PageHeader
        title="Cadastro de clientes"
        subtitle="Cada empresa recebe um ID Lab único (clinica_id) e schema Postgres dedicado. Vincule o ID Excellence Dental Cloud quando o cliente já usa o ERP."
        icon={<IconUsers size={22} />}
        actions={
          <ActionButton variant="primary" icon={<IconPlus size={16} />} onClick={novo}>
            Nova empresa
          </ActionButton>
        }
      />

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="cadastro-toolbar">
          <h3 className="card-title">Clientes provisionados ({rows.length})</h3>
          <div className="cadastro-bulk-actions">
            <ActionButton
              variant="outline"
              size="sm"
              icon={<IconCheck size={14} />}
              disabled={selectedIds.length === 0}
              onClick={() => void ativar(selectedIds)}
            >
              Ativar selecionados
            </ActionButton>
            <ActionButton
              variant="warning"
              size="sm"
              icon={<IconPause size={14} />}
              disabled={selectedIds.length === 0}
              onClick={() => void suspender(selectedIds)}
            >
              Suspender selecionados
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              icon={<IconTrash size={14} />}
              disabled={selectedIds.length === 0}
              onClick={() => void remover(selectedIds)}
            >
              Remover selecionados
            </ActionButton>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="muted">Nenhuma empresa cadastrada.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Selecionar todos"
                    />
                  </th>
                  <th>ID Lab</th>
                  <th>Empresa</th>
                  <th>Cód. ED</th>
                  <th>Excellence ID</th>
                  <th>Status tenant</th>
                  <th>Licença</th>
                  <th>Produto / Período</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.clinicaId} className={editingId === r.clinicaId ? "row-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.clinicaId)}
                        onChange={() => toggleRow(r.clinicaId)}
                        aria-label={`Selecionar ${tenantDisplayName(r)}`}
                      />
                    </td>
                    <td>
                      <strong>#{r.clinicaId}</strong>
                      <br />
                      <code className="muted" style={{ fontSize: "0.75rem" }}>
                        {r.postgresSchema}
                      </code>
                    </td>
                    <td>{tenantDisplayName(r)}</td>
                    <td>{r.clienteCodigo || "—"}</td>
                    <td>{r.excellenceClinicaId ?? "—"}</td>
                    <td>{tenantStatusBadge(r.status)}</td>
                    <td>
                      <span className={licenseStatusClass(r.licenseStatus)}>{r.licenseStatusLabel}</span>
                      {r.licenseDaysLeft != null && r.licenseStatus !== "none" ? (
                        <div className="muted" style={{ fontSize: "0.75rem" }}>
                          {r.licenseDaysLeft} dias
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {r.licenseProduto || "—"}
                      {r.licensePeriodo ? ` · ${r.licensePeriodo}` : ""}
                    </td>
                    <td>
                      <div className="license-actions">
                        <ActionButton variant="outline" size="sm" icon={<IconEdit size={14} />} onClick={() => editar(r)}>
                          Editar
                        </ActionButton>
                        {r.status !== "active" ? (
                          <ActionButton
                            variant="outline"
                            size="sm"
                            icon={<IconCheck size={14} />}
                            onClick={() => void ativar([r.clinicaId])}
                          >
                            Ativar
                          </ActionButton>
                        ) : (
                          <ActionButton
                            variant="warning"
                            size="sm"
                            icon={<IconPause size={14} />}
                            disabled={r.clinicaId === 1}
                            onClick={() => void suspender([r.clinicaId])}
                          >
                            Suspender
                          </ActionButton>
                        )}
                        <NavLink to="/supervisor/tenants" className="btn btn-outline btn-sm btn-with-icon" title="Gerar licença">
                          <span className="btn-icon" aria-hidden>
                            <IconKey size={14} />
                          </span>
                          Licença
                        </NavLink>
                        {r.clinicaId > 1 ? (
                          <ActionButton
                            variant="danger"
                            size="sm"
                            icon={<IconTrash size={14} />}
                            onClick={() => void remover([r.clinicaId])}
                          >
                            Remover
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">
          {editingId ? `Editar empresa #${editingId}` : "Nova empresa"}
          {editingId ? (
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem", marginLeft: 8 }}>
              · ID Lab fixo
            </span>
          ) : null}
        </h3>
        <form onSubmit={salvar} className="form-grid">
          {FIELDS.map((f) => (
            <div key={f.name} className={`form-group${f.full ? " full" : ""}`}>
              <label htmlFor={f.name}>{f.label}</label>
              <input
                id={f.name}
                type={f.type ?? "text"}
                value={form[f.name]}
                onChange={(e) => setField(f.name, e.target.value, f.mask)}
                onBlur={f.name === "cep" ? () => void onCepBlur() : undefined}
                disabled={f.name === "cep" && cepLoading}
                placeholder={
                  f.name === "excellenceClinicaId"
                    ? "Ex: ID clinica_id no Excellence Cloud"
                    : f.name === "clienteCodigo"
                      ? "Ex: ED-20210520-0002"
                      : undefined
                }
              />
            </div>
          ))}
          <div className="form-actions full">
            <ActionButton variant="ghost" type="button" onClick={novo}>
              Limpar
            </ActionButton>
            <ActionButton
              variant={editingId ? "primary" : "purple"}
              type="submit"
              icon={<IconSave size={16} />}
              disabled={loading}
            >
              {loading ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar empresa"}
            </ActionButton>
          </div>
        </form>
      </div>
    </>
  );
}
