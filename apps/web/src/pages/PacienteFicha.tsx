import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type CamAdapterInfo, type CamJob, type Cliente, type PacienteAnexo } from "../api";
import { StatusBadge } from "../components";
import { downloadWithAuth } from "../lib/downloadWithAuth";

type FichaProtese = {
  id: string;
  codigo: string;
  tipoProtese?: string;
  status?: string;
  setor?: string;
  dataEntrada?: string;
};

export default function PacienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<Cliente | null>(null);
  const [proteses, setProteses] = useState<FichaProtese[]>([]);
  const [anexos, setAnexos] = useState<PacienteAnexo[]>([]);
  const [jobs, setJobs] = useState<CamJob[]>([]);
  const [adapters, setAdapters] = useState<CamAdapterInfo[]>([]);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAnexoId, setSelectedAnexoId] = useState("");
  const [adapterId, setAdapterId] = useState("filesystem");
  const [capability, setCapability] = useState<"print" | "mill">("print");

  const loadPasta = useCallback(async (pacienteId: string) => {
    const pasta = await api.pacientes.pasta(pacienteId);
    setAnexos(pasta.anexos);
    setJobs(await api.pacientes.pastaJobs(pacienteId));
    try {
      const ads = await api.cam.adapters();
      setAdapters(ads.filter((a) => a.available && (a.capabilities.includes("print") || a.capabilities.includes("mill"))));
    } catch {
      setAdapters([]);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.clientes
      .ficha(id)
      .then(async (r) => {
        setPaciente(r.paciente);
        setProteses(r.proteses);
        setErro("");
        await loadPasta(id);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar ficha"))
      .finally(() => setLoading(false));
  }, [id, loadPasta]);

  if (loading) return <p className="muted">Carregando ficha…</p>;
  if (erro && !paciente) return <div className="alert alert-error">{erro}</div>;
  if (!paciente) return <div className="alert alert-error">Paciente não encontrado</div>;

  async function onUpload(file: File | null) {
    if (!file || !id) return;
    setUploading(true);
    setErro("");
    try {
      await api.pacientes.uploadAnexo(id, file, "scan");
      setMsg(`Scan importado: ${file.name}`);
      await loadPasta(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function criarJob() {
    if (!id || !selectedAnexoId) {
      setErro("Selecione um anexo para o job CAM");
      return;
    }
    setErro("");
    try {
      const job = await api.cam.createJob({
        pacienteId: id,
        anexoId: selectedAnexoId,
        adapterId,
        capability,
      });
      setMsg(`Job ${job.id.slice(0, 8)}… → ${job.status} (${job.adapterId})`);
      await loadPasta(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar job");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p style={{ margin: 0 }}>
            <Link to="/pacientes">← Pacientes</Link>
          </p>
          <h2 style={{ marginTop: 8 }}>{paciente.nome}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(`/odontograma?pacienteId=${encodeURIComponent(paciente.id)}`)}
          >
            Odontograma
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/proteses?pacienteId=${encodeURIComponent(paciente.id)}&nova=1`)}
          >
            + Nova prótese
          </button>
        </div>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Dados cadastrais</h3>
        <dl className="ficha-dl">
          <div>
            <dt>CPF</dt>
            <dd>{paciente.cpf || "—"}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{paciente.telefone || "—"}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{paciente.email || "—"}</dd>
          </div>
          <div>
            <dt>Endereço</dt>
            <dd>{paciente.endereco || "—"}</dd>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <dt>Observações</dt>
            <dd>{paciente.observacoes || "—"}</dd>
          </div>
          {paciente.erpPacienteId ? (
            <div>
              <dt>ERP paciente</dt>
              <dd>{paciente.erpPacienteId}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Pasta digital (scans CAM)</h3>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Arquivos 3D (STL/PLY/OBJ) do paciente. Diferente do Scanner de código de barras USB.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <label className="btn btn-outline" style={{ cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Enviando…" : "Importar scan"}
            <input
              type="file"
              accept=".stl,.ply,.obj,.STL,.PLY,.OBJ"
              hidden
              disabled={uploading}
              onChange={(e) => {
                void onUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {anexos.length === 0 ? (
          <p className="muted">Nenhum arquivo na pasta.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Arquivo</th>
                  <th>Tipo</th>
                  <th>Tamanho</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {anexos.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="radio"
                        name="anexo-cam"
                        checked={selectedAnexoId === a.id}
                        onChange={() => setSelectedAnexoId(a.id)}
                      />
                    </td>
                    <td>{a.nomeArquivo}</td>
                    <td>{a.tipo}</td>
                    <td>{Math.max(1, Math.round(a.tamanhoBytes / 1024))} KB</td>
                    <td>{a.createdAt?.slice(0, 19) || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                          void downloadWithAuth(api.pacientes.anexoDownloadUrl(paciente.id, a.id), {
                            filename: a.nomeArquivo,
                          }).catch((e) => setErro(e instanceof Error ? e.message : "Download falhou"))
                        }
                      >
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 16, borderTop: "1px solid #e5e5e5", paddingTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>Job CAM (piloto)</h4>
          <div className="form-grid" style={{ maxWidth: 640 }}>
            <div className="form-group">
              <label htmlFor="cam-adapter">Adapter</label>
              <select
                id="cam-adapter"
                value={adapterId}
                onChange={(e) => {
                  setAdapterId(e.target.value);
                  const ad = adapters.find((x) => x.id === e.target.value);
                  if (ad?.capabilities.includes("print")) setCapability("print");
                  else if (ad?.capabilities.includes("mill")) setCapability("mill");
                }}
              >
                {(adapters.length ? adapters : [{ id: "filesystem", label: "Filesystem", capabilities: ["print", "mill"], available: true }]).map(
                  (a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cam-cap">Capacidade</label>
              <select
                id="cam-cap"
                value={capability}
                onChange={(e) => setCapability(e.target.value as "print" | "mill")}
              >
                <option value="print">print (impressora 3D)</option>
                <option value="mill">mill (fresadora)</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => void criarJob()}>
            Enviar job
          </button>
        </div>

        {jobs.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <h4>Jobs recentes</h4>
            <ul className="muted" style={{ fontSize: "0.9rem" }}>
              {jobs.slice(0, 8).map((j) => (
                <li key={j.id}>
                  {j.createdAt?.slice(0, 19)} · {j.adapterId}/{j.capability} · <strong>{j.status}</strong>
                  {j.mensagem ? ` — ${j.mensagem}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Próteses</h3>
        {proteses.length === 0 ? (
          <p className="muted">Nenhuma prótese vinculada a este paciente.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Setor</th>
                  <th>Entrada</th>
                </tr>
              </thead>
              <tbody>
                {proteses.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to="/proteses">{p.codigo}</Link>
                    </td>
                    <td>{p.tipoProtese || "—"}</td>
                    <td>{p.status ? <StatusBadge status={p.status} /> : "—"}</td>
                    <td>{p.setor || "—"}</td>
                    <td>{p.dataEntrada || "—"}</td>
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
