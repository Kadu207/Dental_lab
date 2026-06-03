import { useEffect, useState } from "react";
import { api, type Fornecedor } from "../api";
import { FornecedorForm, fornecedorToForm, type FornecedorFormData } from "../components/FornecedorForm";
import { Modal } from "../components";

export default function FornecedoresPage() {
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Fornecedor } | null>(null);
  const [form, setForm] = useState<FornecedorFormData>(fornecedorToForm());
  const [erro, setErro] = useState("");

  const load = () =>
    api.fornecedores
      .list()
      .then(setItems)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(fornecedorToForm());
    setModal({ mode: "create" });
  };

  const openEdit = (item: Fornecedor) => {
    setForm(fornecedorToForm(item));
    setModal({ mode: "edit", item });
  };

  const save = async (data: FornecedorFormData) => {
    try {
      const payload = {
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia.trim() || undefined,
        cnpj: data.cnpj.trim() || undefined,
        contato: data.contato.trim() || undefined,
        telefone: data.telefone.trim() || undefined,
        email: data.email.trim() || undefined,
        endereco: data.endereco.trim() || undefined,
        observacoes: data.observacoes.trim() || undefined,
      };
      if (modal?.mode === "edit" && modal.item) {
        await api.fornecedores.update(modal.item.id, payload);
      } else {
        await api.fornecedores.create(payload);
      }
      setModal(null);
      load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Fornecedores</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Novo fornecedor
        </button>
      </div>
      <p className="page-desc">Cadastro completo de fornecedores do laboratório (identificação, contato e endereço).</p>
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Razão social</th>
              <th>Nome fantasia</th>
              <th>CNPJ</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td>{f.razaoSocial}</td>
                <td>{f.nomeFantasia ?? "—"}</td>
                <td>{f.cnpj ?? "—"}</td>
                <td>{f.contato ?? "—"}</td>
                <td>{f.telefone ?? "—"}</td>
                <td>{f.email ?? "—"}</td>
                <td className="actions">
                  <button type="button" className="btn btn-outline" onClick={() => openEdit(f)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!confirm("Excluir este fornecedor?")) return;
                      await api.fornecedores.remove(f.id);
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
                <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)" }}>
                  Nenhum fornecedor cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}
          wide
          onClose={() => setModal(null)}
        >
          <FornecedorForm
            value={form}
            onChange={setForm}
            onSubmit={save}
            onCancel={() => setModal(null)}
            submitLabel={modal.mode === "create" ? "Cadastrar" : "Salvar alterações"}
          />
        </Modal>
      )}
    </>
  );
}
