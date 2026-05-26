import { useEffect, useMemo, useState } from "react";
import { api, type FinanceiroLancamento } from "../api";
import { CrudForm, Modal } from "../components";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const FIELDS = [
  {
    name: "tipo",
    label: "Tipo",
    required: true,
    type: "select",
    options: [
      { value: "Entrada", label: "Entrada" },
      { value: "Saída", label: "Saída" },
      { value: "Receita", label: "Receita" },
      { value: "Despesa", label: "Despesa" },
    ],
  },
  { name: "descricao", label: "Descrição", required: true, full: true },
  { name: "valor", label: "Valor (R$)", required: true, type: "number" },
  { name: "dataVencimento", label: "Vencimento", required: true, type: "date" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "Pendente", label: "Pendente" },
      { value: "Recebido", label: "Recebido" },
      { value: "Pago", label: "Pago" },
      { value: "Inadimplente", label: "Inadimplente" },
      { value: "Cancelado", label: "Cancelado" },
    ],
  },
  { name: "formaPagamento", label: "Forma de pagamento" },
];

export default function FinanceiroPage() {
  const [rows, setRows] = useState<FinanceiroLancamento[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  const [modal, setModal] = useState(false);
  const [erro, setErro] = useState("");

  const load = () =>
    api.financeiro.list(filtro).then(setRows).catch((e) => setErro(e.message));
  useEffect(() => {
    load();
  }, [filtro]);

  const resumo = useMemo(() => {
    const receitas = rows
      .filter((r) => ["Entrada", "Receita"].includes(r.tipo))
      .reduce((a, r) => a + r.valor, 0);
    const despesas = rows
      .filter((r) => ["Saída", "Despesa"].includes(r.tipo))
      .reduce((a, r) => a + r.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [rows]);

  const save = async (data: Record<string, string>) => {
    await api.financeiro.create({
      tipo: data.tipo,
      descricao: data.descricao,
      valor: Number(data.valor),
      dataVencimento: data.dataVencimento,
      status: data.status || "Pendente",
      formaPagamento: data.formaPagamento,
    });
    setModal(false);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Financeiro</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          + Novo lançamento
        </button>
      </div>
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="stats">
        <div className="stat-card">
          <div className="num">{brl(resumo.receitas)}</div>
          <div className="lbl">Receitas / entradas</div>
        </div>
        <div className="stat-card">
          <div className="num">{brl(resumo.despesas)}</div>
          <div className="lbl">Despesas / saídas</div>
        </div>
        <div className="stat-card">
          <div className="num">{brl(resumo.saldo)}</div>
          <div className="lbl">Saldo</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Filtrar status:</label>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {["Todos", "Pendente", "Recebido", "Pago", "Inadimplente", "Cancelado"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.dataVencimento}</td>
                <td>{r.tipo}</td>
                <td>{r.descricao}</td>
                <td>{r.status}</td>
                <td>{brl(r.valor)}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!confirm("Excluir lançamento?")) return;
                      await api.financeiro.remove(r.id);
                      load();
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>
                  Nenhum lançamento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Novo lançamento" onClose={() => setModal(false)}>
          <CrudForm
            fields={FIELDS}
            initial={{ status: "Pendente", dataVencimento: new Date().toISOString().slice(0, 10) }}
            onSubmit={save}
            onCancel={() => setModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
