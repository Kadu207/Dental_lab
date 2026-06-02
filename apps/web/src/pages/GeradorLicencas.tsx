import { useEffect, useState } from "react";
import { api } from "../api";
import { useSession } from "../lib/SessionContext";

const PRODUTOS = [
  { value: "lab", label: "Dental Lab (standalone)" },
  { value: "cloud_lab", label: "Cloud + Lab" },
];

const PERIODOS = [
  { value: "trial", label: "Teste (30 dias)" },
  { value: "1y", label: "1 ano" },
  { value: "2y", label: "2 anos" },
  { value: "4y", label: "4 anos" },
  { value: "5y", label: "5 anos" },
];

type LicRow = {
  id: number;
  licenseKey: string;
  clinicaId: number | null;
  unidadeId: string | null;
  produto: string;
  produtoLabel: string;
  periodo: string;
  periodoLabel: string;
  clienteNome: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

const GERADOR_URL = "https://licencas.inovatitech.com.br";

export default function GeradorLicencasPage() {
  const { perfil } = useSession();
  const [rows, setRows] = useState<LicRow[]>([]);
  const [produto, setProduto] = useState("lab");
  const [periodo, setPeriodo] = useState("1y");
  const [clienteNome, setClienteNome] = useState("");
  const [clinicaId, setClinicaId] = useState("1");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = perfil === "admin";

  const refresh = () =>
    api.licencas.list().then((data) => setRows(data as LicRow[])).catch(() => setRows([]));

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="alert alert-error">
        Acesso restrito ao administrador. Supervisores Inova usam o{" "}
        <a href={GERADOR_URL} target="_blank" rel="noreferrer">
          Gerador de Licenças
        </a>
        .
      </div>
    );
  }

  const gerar = async () => {
    setErro("");
    setMsg("");
    setLoading(true);
    try {
      const res = await api.licencas.generate({
        produto,
        periodo,
        cliente_nome: clienteNome,
        clinica_id: clinicaId.trim() ? Number(clinicaId) : null,
        notes,
      });
      setMsg(`Chave gerada: ${res.licenseKey}`);
      await refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  };

  const copiar = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setMsg(`Chave ${key} copiada.`);
    } catch {
      setErro("Não foi possível copiar.");
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Gerador de licenças (local)</h2>
      </div>
      <p className="page-desc">
        Em produção comercial, use o console Inova em{" "}
        <a href={GERADOR_URL} target="_blank" rel="noreferrer">
          {GERADOR_URL}
        </a>{" "}
        (Stripe, clientes, revogação). Esta tela gera chaves no cache local do Lab para testes ou
        contingência.
      </p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginBottom: 12 }}>Nova licença</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Produto</label>
            <select value={produto} onChange={(e) => setProduto(e.target.value)}>
              {PRODUTOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group full">
            <label>Cliente / laboratório</label>
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Clínica ID (tenant)</label>
            <input value={clinicaId} onChange={(e) => setClinicaId(e.target.value)} />
          </div>
          <div className="form-group full">
            <label>Observações</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={gerar} style={{ marginTop: 12 }}>
          {loading ? "Gerando…" : "Gerar chave (25 caracteres)"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Licenças locais ({rows.length})</h3>
        {rows.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Nenhuma licença no cache local.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chave</th>
                  <th>Produto</th>
                  <th>Período</th>
                  <th>Status</th>
                  <th>Cliente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code>{r.licenseKey}</code>
                    </td>
                    <td>{r.produtoLabel}</td>
                    <td>{r.periodoLabel}</td>
                    <td>{r.status}</td>
                    <td>{r.clienteNome || "—"}</td>
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
    </>
  );
}
