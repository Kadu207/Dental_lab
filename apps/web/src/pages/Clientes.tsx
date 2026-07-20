import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Cliente } from "../api";
import { CrudForm, Modal } from "../components";
import { DEFAULT_PAGE_SIZE, PaginationBar } from "../components/PaginationBar";

const FIELDS = [
  { name: "nome", label: "Nome completo", required: true, full: true },
  { name: "cpf", label: "CPF" },
  { name: "telefone", label: "Telefone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "observacoes", label: "Observações", type: "textarea", full: true },
];

export default function ClientesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Cliente } | null>(null);
  const [erro, setErro] = useState("");

  const load = (pageOffset = offset, search = qApplied) =>
    api.clientes
      .listPaginated(DEFAULT_PAGE_SIZE, pageOffset, search || undefined)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setOffset(r.offset);
      })
      .catch((e) => setErro(e.message));

  useEffect(() => {
    load(0, "");
  }, []);

  const applySearch = () => {
    const next = q.trim();
    setQApplied(next);
    load(0, next);
  };

  const save = async (data: Record<string, string>) => {
    try {
      if (modal?.mode === "edit" && modal.item) {
        await api.clientes.update(modal.item.id, data);
      } else {
        await api.clientes.create(data);
      }
      setModal(null);
      load(offset, qApplied);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este paciente?")) return;
    await api.clientes.remove(id);
    load(offset, qApplied);
  };

  return (
    <>
      <div className="page-header">
        <h2>Pacientes</h2>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
          + Novo Paciente
        </button>
      </div>
      {erro && <div className="alert alert-error">{erro}</div>}
      <div className="card" style={{ marginBottom: 12 }}>
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            type="search"
            placeholder="Buscar por nome, CPF ou telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar pacientes"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="submit" className="btn btn-outline">
            Buscar
          </button>
          {qApplied ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setQ("");
                setQApplied("");
                load(0, "");
              }}
            >
              Limpar
            </button>
          ) : null}
        </form>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/pacientes/${c.id}`}>{c.nome}</Link>
                </td>
                <td>{c.cpf ?? "—"}</td>
                <td>{c.telefone ?? "—"}</td>
                <td>{c.email ?? "—"}</td>
                <td className="actions">
                  <button className="btn btn-outline" onClick={() => navigate(`/pacientes/${c.id}`)}>
                    Ficha
                  </button>
                  <button className="btn btn-outline" onClick={() => setModal({ mode: "edit", item: c })}>
                    Editar
                  </button>
                  <button className="btn btn-danger" onClick={() => remove(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>
                  Nenhum paciente encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationBar
          total={total}
          limit={DEFAULT_PAGE_SIZE}
          offset={offset}
          onChange={(nextOffset) => load(nextOffset, qApplied)}
        />
      </div>
      {modal && (
        <Modal title={modal.mode === "create" ? "Novo Paciente" : "Editar Paciente"} onClose={() => setModal(null)}>
          <CrudForm
            fields={FIELDS}
            initial={modal.item as unknown as Record<string, string>}
            onSubmit={save}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
