import { useEffect, useState } from "react";
import { api, type Colaborador, type UsuarioPermissao } from "../api";
import { CrudForm, Modal } from "../components";
import { RbacPerfilPoliticas } from "../components/auth/RbacPerfilPoliticas";
import { IS_EMBEDDED } from "../lib/auth";
import { getPerfilPolitica, TENANT_PERFIL_OPTIONS } from "../lib/rbac-perfis";

const FIELDS_CREATE = [
  { name: "nome", label: "Nome", required: true },
  { name: "email", label: "E-mail", type: "email" },
  { name: "senha", label: "Senha", required: true, type: "password" },
  {
    name: "perfil",
    label: "Perfil / hierarquia",
    required: true,
    type: "select",
    options: TENANT_PERFIL_OPTIONS,
  },
  { name: "descricao", label: "Função / observações", full: true },
];

const FIELDS_EDIT = FIELDS_CREATE.filter((f) => f.name !== "senha").concat([
  { name: "senha", label: "Nova senha (opcional)", type: "password" },
]);

function PerfilSelecionadoHint({ perfilId }: { perfilId: string }) {
  const p = getPerfilPolitica(perfilId);
  if (!p) return null;
  return (
    <p className="rbac-perfil-hint">
      <strong>{p.label}:</strong> {p.desc}
    </p>
  );
}

export default function ColaboradoresPage() {
  const [items, setItems] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | "perm" | null>(null);
  const [atual, setAtual] = useState<Colaborador | null>(null);
  const [permRaw, setPermRaw] = useState("[]");
  const [formPerfil, setFormPerfil] = useState("");
  const [erro, setErro] = useState("");

  const load = () => api.usuarios.list().then(setItems).catch((e) => setErro(e.message));
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setFormPerfil("");
    setModal("create");
  };

  const openEdit = (c: Colaborador) => {
    setAtual(c);
    setFormPerfil(c.perfil);
    setModal("edit");
  };

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
          <button className="btn btn-primary" onClick={openCreate}>
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
          : "Cadastro da equipe com perfil hierárquico e políticas de acesso (RBAC)."}
      </p>
      {erro && <div className="alert alert-error">{erro}</div>}

      {!IS_EMBEDDED && (
        <div style={{ marginBottom: 20 }}>
          <RbacPerfilPoliticas selectedPerfil={formPerfil || undefined} />
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              {!IS_EMBEDDED && <th>Ativo</th>}
              {!IS_EMBEDDED && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const pol = getPerfilPolitica(c.perfil);
              return (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>
                    <span className="badge badge-recebido">{pol?.label ?? c.perfil}</span>
                    {pol && (
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                        {pol.desc}
                      </span>
                    )}
                    {c.perfilLab && c.perfilLab !== c.perfil && (
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 6 }}>
                        → lab: {c.perfilLab}
                      </span>
                    )}
                  </td>
                  {!IS_EMBEDDED && <td>{c.ativo ? "Sim" : "Não"}</td>}
                  {!IS_EMBEDDED && (
                    <td className="actions">
                      <button className="btn btn-outline" onClick={() => openEdit(c)}>
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
              );
            })}
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
          <CrudForm
            fields={FIELDS_CREATE}
            onChange={(d) => setFormPerfil(d.perfil ?? "")}
            onSubmit={saveCreate}
            onCancel={() => setModal(null)}
          />
          <PerfilSelecionadoHint perfilId={formPerfil} />
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
            onChange={(d) => setFormPerfil(d.perfil ?? "")}
            onSubmit={saveEdit}
            onCancel={() => setModal(null)}
          />
          <PerfilSelecionadoHint perfilId={formPerfil} />
        </Modal>
      )}
      {modal === "perm" && atual && (
        <Modal title={`Políticas — ${atual.nome}`} onClose={() => setModal(null)}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 8 }}>
            Sobrescreve o padrão do perfil <strong>{atual.perfil}</strong>. JSON: resource (ex:
            financeiro, proteses) e actions: read, write, delete.
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
