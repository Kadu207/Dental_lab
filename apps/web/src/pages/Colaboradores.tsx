import { useEffect, useState } from "react";
import { api, type Colaborador, type UsuarioPermissao } from "../api";
import { CrudForm, Modal } from "../components";
import { IS_EMBEDDED } from "../lib/auth";

const PERFIS = [
  { value: "admin", label: "Administrador" },
  { value: "gestor", label: "Gestor" },
  { value: "recepcao", label: "Recepção" },
  { value: "colaborador", label: "Colaborador" },
  { value: "laboratorio", label: "Laboratório" },
  { value: "estagiario", label: "Estagiário" },
];

const FIELDS_CREATE = [
  { name: "nome", label: "Nome", required: true },
  { name: "email", label: "E-mail", type: "email" },
  { name: "senha", label: "Senha", required: true, type: "password" },
  { name: "perfil", label: "Perfil / hierarquia", required: true, type: "select", options: PERFIS },
  { name: "descricao", label: "Função / observações", full: true },
];

const FIELDS_EDIT = FIELDS_CREATE.filter((f) => f.name !== "senha").concat([
  { name: "senha", label: "Nova senha (opcional)", type: "password" },
]);

export default function ColaboradoresPage() {
  const [items, setItems] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | "perm" | null>(null);
  const [atual, setAtual] = useState<Colaborador | null>(null);
  const [permRaw, setPermRaw] = useState("[]");
  const [erro, setErro] = useState("");

  const load = () => api.usuarios.list().then(setItems).catch((e) => setErro(e.message));
  useEffect(() => {
    load();
  }, []);

  const saveCreate = async (data: Record<string, string>) => {
    await api.usuarios.create({
      nome: data.nome,
      senha: data.senha,
      email: data.email,
      perfil: data.perfil,
      descricao: data.descricao,
    });
    setModal(null);
    load();
  };

  const saveEdit = async (data: Record<string, string>) => {
    if (!atual) return;
    await api.usuarios.update(atual.id, {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      descricao: data.descricao,
      ...(data.senha ? { senha: data.senha } : {}),
    });
    setModal(null);
    load();
  };

  const savePerm = async () => {
    if (!atual) return;
    const permissoes = JSON.parse(permRaw) as UsuarioPermissao[];
    await api.usuarios.updatePermissoes(atual.id, permissoes);
    setModal(null);
    load();
  };

  const openErpColaboradores = () => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.location.href = "/dashboard/colaboradores";
      }
    } catch {
      /* cross-origin */
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Colaboradores</h2>
        {!IS_EMBEDDED && (
          <button className="btn btn-primary" onClick={() => setModal("create")}>
            + Novo colaborador
          </button>
        )}
        {IS_EMBEDDED && (
          <button type="button" className="btn btn-outline" onClick={openErpColaboradores}>
            Abrir no Excellence
          </button>
        )}
      </div>
      <p className="page-desc">
        {IS_EMBEDDED
          ? "Lista sincronizada com os usuários do Excellence Dental (somente leitura neste módulo)."
          : "Equipe com perfil hierárquico e políticas de acesso (RBAC)."}
      </p>
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil ERP</th>
              {!IS_EMBEDDED && <th>Ativo</th>}
              {!IS_EMBEDDED && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.email ?? "—"}</td>
                <td>
                  <span className="badge badge-recebido">{c.perfil}</span>
                  {c.perfilLab && c.perfilLab !== c.perfil && (
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 6 }}>
                      → lab: {c.perfilLab}
                    </span>
                  )}
                </td>
                {!IS_EMBEDDED && <td>{c.ativo ? "Sim" : "Não"}</td>}
                {!IS_EMBEDDED && (
                  <td className="actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setAtual(c);
                        setModal("edit");
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setAtual(c);
                        setPermRaw(JSON.stringify(c.permissoes ?? [], null, 2));
                        setModal("perm");
                      }}
                    >
                      Políticas
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        if (!confirm("Excluir colaborador?")) return;
                        await api.usuarios.remove(c.id);
                        load();
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={IS_EMBEDDED ? 3 : 5} style={{ textAlign: "center", color: "#64748b" }}>
                  Nenhum colaborador
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "create" && (
        <Modal title="Novo colaborador" onClose={() => setModal(null)}>
          <CrudForm fields={FIELDS_CREATE} onSubmit={saveCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "edit" && atual && (
        <Modal title="Editar colaborador" onClose={() => setModal(null)}>
          <CrudForm
            fields={FIELDS_EDIT}
            initial={{
              nome: atual.nome,
              email: atual.email ?? "",
              perfil: atual.perfil,
              descricao: atual.descricao ?? "",
            }}
            onSubmit={saveEdit}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "perm" && atual && (
        <Modal title={`Políticas — ${atual.nome}`} onClose={() => setModal(null)}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 8 }}>
            JSON: resource (ex: financeiro, proteses) e actions: read, write, delete.
          </p>
          <textarea
            rows={12}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }}
            value={permRaw}
            onChange={(e) => setPermRaw(e.target.value)}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={savePerm}>
              Salvar políticas
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
