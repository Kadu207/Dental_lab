import { useEffect, useState } from "react";
import { api, type Fornecedor } from "../api";
import { CrudForm, Modal } from "../components";

const FIELDS = [
  { name: "razaoSocial", label: "Razão Social", required: true, full: true },
  { name: "nomeFantasia", label: "Nome Fantasia" },
  { name: "cnpj", label: "CNPJ" },
  { name: "contato", label: "Contato" },
  { name: "telefone", label: "Telefone" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "observacoes", label: "Observações", type: "textarea", full: true },
];

export default function FornecedoresPage() {
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Fornecedor } | null>(null);

  const load = () => api.fornecedores.list().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async (data: Record<string, string>) => {
    if (modal?.mode === "edit" && modal.item) {
      await api.fornecedores.update(modal.item.id, data);
    } else {
      await api.fornecedores.create(data);
    }
    setModal(null);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Fornecedores</h2>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>+ Novo Fornecedor</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Razão Social</th><th>CNPJ</th><th>Contato</th><th>Telefone</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td>{f.razaoSocial}</td>
                <td>{f.cnpj ?? "—"}</td>
                <td>{f.contato ?? "—"}</td>
                <td>{f.telefone ?? "—"}</td>
                <td className="actions">
                  <button className="btn btn-outline" onClick={() => setModal({ mode: "edit", item: f })}>Editar</button>
                  <button className="btn btn-danger" onClick={async () => { if (confirm("Excluir?")) { await api.fornecedores.remove(f.id); load(); } }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} onClose={() => setModal(null)}>
          <CrudForm fields={FIELDS} initial={modal.item as unknown as Record<string, string>} onSubmit={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
