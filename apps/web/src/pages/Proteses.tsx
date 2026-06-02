import { useEffect, useState } from "react";
import { api, type Cliente, type LabConfig, type Protese } from "../api";
import { CrudForm, Modal, StatusBadge } from "../components";
import { TAMANHOS_ETIQUETA, resolveTamanho, type TamanhoEtiqueta } from "../lib/labelSizes";
import { SETORES_LAB } from "../lib/setores";
import { downloadWithAuth } from "../lib/downloadWithAuth";
import { DEFAULT_PAGE_SIZE, PaginationBar } from "../components/PaginationBar";

export default function ProtesesPage() {
  const [proteses, setProteses] = useState<Protese[]>([]);
  const [protesesTotal, setProtesesTotal] = useState(0);
  const [protesesOffset, setProtesesOffset] = useState(0);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [labConfig, setLabConfig] = useState<LabConfig | null>(null);
  const [modal, setModal] = useState(false);
  const [ultima, setUltima] = useState<Protese | null>(null);
  const [tamanho, setTamanho] = useState<TamanhoEtiqueta>("termica_100x50");
  const [setorNovo, setSetorNovo] = useState("gesso");
  const [pacienteSel, setPacienteSel] = useState("");

  const load = async (pageOffset = protesesOffset) => {
    const [protesesPage, clientesList, cfg] = await Promise.all([
      api.proteses.listPaginated(DEFAULT_PAGE_SIZE, pageOffset),
      api.clientes.list(),
      api.config.getLab(),
    ]);
    setProteses(protesesPage.items);
    setProtesesTotal(protesesPage.total);
    setProtesesOffset(protesesPage.offset);
    setClientes(clientesList);
    setLabConfig(cfg);
    setTamanho(resolveTamanho(cfg));
  };
  useEffect(() => {
    void load(0);
  }, []);

  const save = async (data: Record<string, string>) => {
    if (!pacienteSel) {
      alert("Selecione o paciente — nome e telefone vão para a etiqueta");
      return;
    }
    const result = await api.proteses.create({
      pacienteId: pacienteSel,
      dentistaNome: data.dentistaNome,
      dentistaCro: data.dentistaCro,
      dentistaClinica: data.dentistaClinica,
      tipoProtese: data.nomeAmostra || data.tipoProtese,
      dentes: data.dentes,
      cor: data.cor,
      material: data.material,
      observacoes: data.observacoes,
      dataEntrada: data.dataEntrada,
      dataPrevistaEntrega: data.dataPrevistaEntrega,
      setor: setorNovo,
    });
    setUltima(result.protese);
    setModal(false);
    void load(0);
  };

  const imprimir = (id: string) => {
    void downloadWithAuth(api.proteses.imprimirUrl(id, tamanho), { openInNewTab: true }).catch((e) =>
      alert(e instanceof Error ? e.message : "Erro ao imprimir"),
    );
  };

  return (
    <>
      <div className="page-header">
        <h2>Registro de Próteses</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.85rem", display: "flex", gap: 6, alignItems: "center" }}>
            Etiqueta:
            <select value={tamanho} onChange={(e) => setTamanho(e.target.value as TamanhoEtiqueta)}>
              {TAMANHOS_ETIQUETA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            + Nova Prótese
          </button>
        </div>
      </div>

      {ultima && (
        <div className="alert alert-success">
          ✅ Prótese <strong>{ultima.codigo}</strong> registrada!
          <button className="btn btn-accent" style={{ marginLeft: 12 }} onClick={() => imprimir(ultima.id)}>
            🖨️ Imprimir 3 vias ({TAMANHOS_ETIQUETA.find((t) => t.value === tamanho)?.label})
          </button>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Paciente</th>
              <th>Dentista</th>
              <th>Trabalho</th>
              <th>Setor</th>
              <th>Entrada</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {proteses.map((p) => (
              <tr key={p.id}>
                <td><code>{p.codigo}</code></td>
                <td>{p.paciente.nome}</td>
                <td>{p.dentista.nome}</td>
                <td>{p.tipoProtese}</td>
                <td>{p.setor ?? "gesso"}</td>
                <td>{new Date(p.dataEntrada).toLocaleDateString("pt-BR")}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="actions">
                  <button className="btn btn-accent" onClick={() => imprimir(p.id)}>🖨️ 3 vias</button>
                </td>
              </tr>
            ))}
            {proteses.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#64748b" }}>Nenhuma prótese registrada</td></tr>
            )}
          </tbody>
        </table>
        <PaginationBar
          total={protesesTotal}
          limit={DEFAULT_PAGE_SIZE}
          offset={protesesOffset}
          onPage={(next) => void load(next)}
        />
      </div>

      {modal && (
        <Modal title="Nova Prótese — Gera etiqueta (7 campos + código de barras)" onClose={() => setModal(false)}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Paciente *</label>
            <select value={pacienteSel} onChange={(e) => setPacienteSel(e.target.value)} required>
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.cpf ? ` — ${c.cpf}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Setor inicial</label>
            <select value={setorNovo} onChange={(e) => setSetorNovo(e.target.value)}>
              {SETORES_LAB.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <CrudForm
            fields={[
              { name: "dentistaNome", label: "Nome do Dentista", required: true },
              { name: "dentistaCro", label: "CRO" },
              { name: "dentistaClinica", label: "Clínica" },
              {
                name: "nomeAmostra",
                label: "Nome Amostra (tipo/descrição) *",
                required: true,
                full: true,
              },
              { name: "dentes", label: "Elementos / Dentes (aparece no Nome Amostra)" },
              { name: "dataEntrada", label: "Data Entrada (campo Data da etiqueta)", type: "date" },
              { name: "cor", label: "Cor" },
              { name: "material", label: "Material" },
              { name: "dataPrevistaEntrega", label: "Previsão Entrega", type: "date" },
              { name: "observacoes", label: "Observações internas", type: "textarea", full: true },
            ]}
            initial={{ dataEntrada: new Date().toISOString().slice(0, 10) }}
            onSubmit={(data) => save(data)}
            onCancel={() => setModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
