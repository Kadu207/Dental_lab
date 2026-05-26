import { useEffect, useState } from "react";
import { api, type Cliente } from "../api";
import { CrudForm, Modal } from "../components";

const FIELDS = [
  { name: "nome", label: "Nome completo", required: true, full: true },
  { name: "cpf", label: "CPF" },
  { name: "telefone", label: "Telefone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "observacoes", label: "Observações", type: "textarea", full: true },
];

export default function ClientesPage() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Cliente } | null>(null);
  const [erro, setErro] = useState("");

  const load = () => api.clientes.list().then(setItems).catch((e) => setErro(e.message));
  useEffect(() => { load(); }, []);

  const save = async (data: Record<string, string>) => {
    try {
      if (modal?.mode === "edit" && modal.item) {
        await api.clientes.update(modal.item.id, data);
      } else {
        await api.clientes.create(data);
      }
      setModal(null);
      load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este paciente?")) return;
    await api.clientes.remove(id);
    load();
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
                <td>{c.nome}</td>
                <td>{c.cpf ?? "—"}</td>
                <td>{c.telefone ?? "—"}</td>
                <td>{c.email ?? "—"}</td>
                <td className="actions">
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
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>Nenhum paciente cadastrado</td></tr>
            )}
          </tbody>
        </table>
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
