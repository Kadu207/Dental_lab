import { useEffect, useState } from "react";
import { api, type Procedimento } from "../api";
import { CrudForm, Modal } from "../components";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const FIELDS = [
  { name: "nome", label: "Procedimento / trabalho", required: true, full: true },
  { name: "valor", label: "Valor (R$)", required: true, type: "number" },
  { name: "custoEstimado", label: "Custo estimado (R$)", type: "number" },
  {
    name: "geraComissao",
    label: "Gera comissão?",
    type: "select",
    options: [
      { value: "Não", label: "Não" },
      { value: "Sim", label: "Sim" },
    ],
  },
  { name: "comissaoPerc", label: "% comissão", type: "number" },
];

export default function ProcedimentosPage() {
  const [items, setItems] = useState<Procedimento[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [atual, setAtual] = useState<Procedimento | null>(null);
  const [erro, setErro] = useState("");

  const load = () => api.procedimentos.list().then(setItems).catch((e) => setErro(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async (data: Record<string, string>) => {
    const payload = {
      nome: data.nome,
      valor: Number(data.valor),
      custoEstimado: Number(data.custoEstimado) || 0,
      geraComissao: data.geraComissao,
      comissaoPerc: Number(data.comissaoPerc) || 0,
    };
    if (modal === "edit" && atual) {
      await api.procedimentos.update(atual.id, payload);
    } else {
      await api.procedimentos.create(payload);
    }
    setModal(null);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Procedimentos</h2>
        <button className="btn btn-primary" onClick={() => setModal("create")}>
          + Novo procedimento
        </button>
      </div>
      <p className="page-desc">Tabela de serviços, valores e percentual de comissão (como no Excellence).</p>
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Procedimento</th>
              <th>Valor</th>
              <th>Custo</th>
              <th>Margem</th>
              <th>Comissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{brl(p.valor)}</td>
                <td>{brl(p.custoEstimado)}</td>
                <td style={{ color: (p.margemEstimada ?? 0) >= 0 ? "var(--accent)" : "var(--danger)" }}>
                  {brl(p.margemEstimada ?? 0)}
                </td>
                <td>
                  {p.geraComissao === "Sim" ? `${p.comissaoPerc}%` : "—"}
                </td>
                <td className="actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setAtual(p);
                      setModal("edit");
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!confirm("Excluir procedimento?")) return;
                      await api.procedimentos.remove(p.id);
                      load();
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>
                  Nenhum procedimento cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Novo procedimento" : "Editar procedimento"} onClose={() => setModal(null)}>
          <CrudForm
            fields={FIELDS}
            initial={
              atual
                ? {
                    nome: atual.nome,
                    valor: String(atual.valor),
                    custoEstimado: String(atual.custoEstimado),
                    geraComissao: atual.geraComissao,
                    comissaoPerc: String(atual.comissaoPerc),
                  }
                : { geraComissao: "Não", comissaoPerc: "0" }
            }
            onSubmit={save}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
