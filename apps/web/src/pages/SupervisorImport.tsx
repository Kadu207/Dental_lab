import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type TenantRecord } from "../api";
import { canAccessSupervisorConsole } from "../lib/auth";
import { useSession } from "../lib/SessionContext";

function tenantLabel(t: TenantRecord) {
  return t.nomeFantasia || t.razaoSocial || `Tenant ${t.clinicaId}`;
}

export default function SupervisorImportPage() {
  const { perfil } = useSession();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clinicaId, setClinicaId] = useState("");
  const [replace, setReplace] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formRazao, setFormRazao] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formClienteCodigo, setFormClienteCodigo] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.supervisor.listTenants().then((rows) => {
      setTenants(rows);
      if (rows.length > 0) setClinicaId(String(rows[0].clinicaId));
    });
  }, []);

  if (perfil && !canAccessSupervisorConsole(perfil)) {
    return <Navigate to="/" replace />;
  }

  async function readFile(file: File): Promise<unknown> {
    return JSON.parse(await file.text()) as unknown;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErro("Selecione o arquivo JSON de backup.");
      return;
    }

    if (mode === "existing" && replace) {
      const ok = window.confirm(
        `Substituir todos os dados do tenant #${clinicaId}? Esta ação apaga o conteúdo atual do schema.`,
      );
      if (!ok) return;
    }

    if (mode === "new") {
      const ok = window.confirm("Criar um novo tenant e importar o backup neste schema lab_tN?");
      if (!ok) return;
    }

    setLoading(true);
    setErro("");
    setMsg("");
    try {
      const bundle = await readFile(file);
      if (mode === "new") {
        const result = await api.supervisor.importBackupNewTenant(bundle, {
          nomeFantasia: formNome.trim() || null,
          razaoSocial: formRazao.trim() || null,
          cnpj: formCnpj.trim() || null,
          clienteCodigo: formClienteCodigo.trim() || null,
        });
        setMsg(`${result.msg} — tenant #${result.tenant.clinicaId} (${result.tenant.postgresSchema}).`);
      } else {
        const cid = Number(clinicaId);
        const result = await api.supervisor.importBackup(cid, bundle, replace);
        setMsg(`${result.msg} — ${result.importedRows} linhas importadas no tenant #${cid}.`);
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao importar backup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Importação de banco de dados</h2>
      </div>
      <p className="page-desc">
        Restaura backup lógico JSON exportado pelo Dental Lab (banco antigo, outro tenant ou ambiente de teste).
        Para backup físico Postgres (pg_dump), use os scripts em <code>infra/ops/</code> na VPS.
      </p>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ maxWidth: 900 }}>
        <h3 style={{ marginBottom: 12 }}>Importar backup JSON</h3>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group full">
            <label>Destino</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as "existing" | "new")}>
              <option value="existing">Tenant existente</option>
              <option value="new">Criar novo tenant (lab_tN)</option>
            </select>
          </div>

          {mode === "existing" ? (
            <div className="form-group full">
              <label>Cliente provisionado (tenant)</label>
              <select value={clinicaId} onChange={(e) => setClinicaId(e.target.value)} required>
                {tenants.map((t) => (
                  <option key={t.clinicaId} value={t.clinicaId}>
                    #{t.clinicaId} — {tenantLabel(t)} ({t.postgresSchema})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group full">
                <label>Razão social (novo tenant)</label>
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
                <label>Código comercial</label>
                <input value={formClienteCodigo} onChange={(e) => setFormClienteCodigo(e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group full">
            <label>Arquivo backup (.json)</label>
            <input ref={fileRef} type="file" accept="application/json,.json" required />
          </div>

          {mode === "existing" ? (
            <div className="form-group full">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Substituir dados existentes (apaga conteúdo atual do tenant antes de importar)
              </label>
            </div>
          ) : null}

          <div className="form-actions full">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Importando…" : "Importar backup"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
