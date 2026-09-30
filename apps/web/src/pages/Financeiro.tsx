import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Cliente, type FinanceiroLancamento, type FinanceiroResumo } from "../api";
import { CrudForm, Modal } from "../components";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ProteseOpt = { id: string; codigo: string; tipoProtese: string; status: string };

const BASE_FIELDS = [
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

const emptyResumo: FinanceiroResumo = { receitas: 0, despesas: 0, saldo: 0, quantidade: 0 };

export default function FinanceiroPage() {
  const [rows, setRows] = useState<FinanceiroLancamento[]>([]);
  const [resumo, setResumo] = useState<FinanceiroResumo>(emptyResumo);
  const [filtro, setFiltro] = useState("Todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FinanceiroLancamento | null>(null);
  const [erro, setErro] = useState("");
  const [pacientes, setPacientes] = useState<Cliente[]>([]);
  const [proteses, setProteses] = useState<ProteseOpt[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [proteseId, setProteseId] = useState("");

  const queryParams = useCallback(
    () => ({
      status: filtro,
      de: de || undefined,
      ate: ate || undefined,
    }),
    [filtro, de, ate],
  );

  const load = useCallback(() => {
    const params = queryParams();
    Promise.all([api.financeiro.list(params), api.financeiro.resumo(params)])
      .then(([list, sum]) => {
        setRows(list);
        setResumo(sum);
        setErro("");
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [queryParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.clientes
      .list()
      .then((r) => setPacientes(Array.isArray(r) ? r : []))
      .catch(() => setPacientes([]));
  }, []);

  useEffect(() => {
    if (!pacienteId) {
      setProteses([]);
      setProteseId("");
      return;
    }
    api.clientes
      .ficha(pacienteId)
      .then((f) =>
        setProteses(
          f.proteses.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            tipoProtese: p.tipoProtese ?? "",
            status: p.status ?? "",
          })),
        ),
      )
      .catch(() => setProteses([]));
  }, [pacienteId]);

  const openCreate = () => {
    setEditing(null);
    setPacienteId("");
    setProteseId("");
    setModal(true);
  };

  const openEdit = (r: FinanceiroLancamento) => {
    setEditing(r);
    setPacienteId(r.pacienteId ?? "");
    setProteseId(r.proteseId ?? "");
    setModal(true);
  };

  const save = async (data: Record<string, string>) => {
    const payload = {
      tipo: data.tipo,
      descricao: data.descricao,
      valor: Number(data.valor),
      dataVencimento: data.dataVencimento,
      status: data.status || "Pendente",
      formaPagamento: data.formaPagamento || null,
      pacienteId: pacienteId || null,
      proteseId: proteseId || null,
    };
    try {
      if (editing) await api.financeiro.update(editing.id, payload);
      else await api.financeiro.create(payload);
      setModal(false);
      setEditing(null);
      load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  const formFields = [
    ...BASE_FIELDS,
    {
      name: "_paciente",
      label: "Paciente (opcional)",
      type: "select",
      full: true,
      options: [
        { value: "", label: "— sem vínculo —" },
        ...pacientes.map((p) => ({ value: p.id, label: p.nome })),
      ],
    },
    {
      name: "_protese",
      label: "Prótese (opcional)",
      type: "select",
      full: true,
      options: [
        { value: "", label: pacienteId ? "— sem prótese —" : "Selecione um paciente antes" },
        ...proteses.map((p) => ({
          value: p.id,
          label: `${p.codigo}${p.tipoProtese ? ` · ${p.tipoProtese}` : ""}`,
        })),
      ],
    },
  ];

  const initialForm: Record<string, string> = editing
    ? {
        tipo: editing.tipo,
        descricao: editing.descricao,
        valor: String(editing.valor),
        dataVencimento: editing.dataVencimento?.slice(0, 10) ?? "",
        status: editing.status,
        formaPagamento: editing.formaPagamento ?? "",
        _paciente: editing.pacienteId ?? "",
        _protese: editing.proteseId ?? "",
      }
    : {
        tipo: "Receita",
        descricao: "",
        valor: "",
        status: "Pendente",
        dataVencimento: new Date().toISOString().slice(0, 10),
        formaPagamento: "",
        _paciente: "",
        _protese: "",
      };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Financeiro</h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Lançamentos operacionais do laboratório. PIX/boleto/NF-e fora deste módulo.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Novo lançamento
        </button>
      </div>
      {erro ? <div className="alert alert-error">{erro}</div> : null}

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
          <div className="lbl">Saldo do período</div>
        </div>
        <div className="stat-card">
          <div className="num">{resumo.quantidade}</div>
          <div className="lbl">Lançamentos</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="form-grid" style={{ alignItems: "end" }}>
          <div className="form-group">
            <label htmlFor="fin-status">Status</label>
            <select id="fin-status" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              {["Todos", "Pendente", "Recebido", "Pago", "Inadimplente", "Cancelado"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="fin-de">Vencimento de</label>
            <input id="fin-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="fin-ate">até</label>
            <input id="fin-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="form-group">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFiltro("Todos");
                setDe("");
                setAte("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Vínculo</th>
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
                  <td>
                    {r.pacienteId ? (
                      <Link to={`/pacientes/${encodeURIComponent(r.pacienteId)}`}>Paciente</Link>
                    ) : (
                      "—"
                    )}
                    {r.proteseId ? ` · prótese` : ""}
                  </td>
                  <td>{brl(r.valor)}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-outline" onClick={() => openEdit(r)}>
                      Editar
                    </button>
                    <button
                      type="button"
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>
                    Nenhum lançamento no filtro atual
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {modal ? (
        <Modal title={editing ? "Editar lançamento" : "Novo lançamento"} onClose={() => setModal(false)}>
          <CrudForm
            fields={formFields}
            initial={initialForm}
            onChange={(data) => {
              if (data._paciente !== undefined && data._paciente !== pacienteId) {
                setPacienteId(data._paciente);
                setProteseId("");
              }
              if (data._protese !== undefined) setProteseId(data._protese);
            }}
            onSubmit={save}
            onCancel={() => setModal(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}
