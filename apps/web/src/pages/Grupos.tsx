import { useEffect, useState } from "react";
import { api, type Colaborador, type GrupoAtribuicao, type UsuarioPermissao } from "../api";
import { IS_EMBEDDED } from "../lib/auth";
import { canAccess } from "../lib/permissions";

import { RbacPerfilPoliticas } from "../components/auth/RbacPerfilPoliticas";
import { getPerfilPolitica, TENANT_PERFIL_OPTIONS } from "../lib/rbac-perfis";

const PERFIS = TENANT_PERFIL_OPTIONS;

export default function GruposPage() {
  const [me, setMe] = useState<{
    roleEfetivo: string;
    permissoes: UsuarioPermissao[];
    perfil: string;
  } | null>(null);
  const [grupos, setGrupos] = useState<GrupoAtribuicao[]>([]);
  const [usuarios, setUsuarios] = useState<Colaborador[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("colaborador");
  const [erro, setErro] = useState("");

  const podeEscrever = me ? canAccess(me.permissoes, "grupos", "write") : false;

  const load = async () => {
    try {
      const m = await api.grupos.me();
      setMe({ roleEfetivo: m.roleEfetivo, permissoes: m.permissoes, perfil: m.perfil });
      setGrupos(await api.grupos.list());
      try {
        setUsuarios(await api.usuarios.list());
      } catch {
        setUsuarios([]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const atribuir = async () => {
    if (!userId) return;
    await api.grupos.assign(userId, role);
    setUserId("");
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Grupos e permissões</h2>
      </div>
      <p className="page-desc">
        {IS_EMBEDDED
          ? "Perfis do Excellence mapeados para o laboratório. Atribuições extras ficam no schema dental_lab."
          : "Hierarquia efetiva e políticas de menu (RBAC)."}
      </p>
      {erro && <div className="alert alert-error">{erro}</div>}

      {me && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Sua sessão</h3>
          <p>
            Perfil ERP: <strong>{me.perfil}</strong> · Perfil efetivo no lab: <strong>{me.roleEfetivo}</strong>
          </p>
          <ul style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--muted)" }}>
            {me.permissoes.slice(0, 10).map((p) => (
              <li key={p.resource}>
                {p.resource}: {p.actions.join(", ")}
              </li>
            ))}
            {me.permissoes.length > 10 && <li>…</li>}
          </ul>
        </div>
      )}

      {!IS_EMBEDDED && (
        <div style={{ marginBottom: 20 }}>
          <RbacPerfilPoliticas selectedPerfil={role} tenantOnly />
        </div>
      )}

      {podeEscrever && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Atribuir perfil no módulo lab</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 10 }}>
            Sobrescreve o mapeamento padrão ERP → lab para este usuário (tabela dental_lab.grupos_permissoes).
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>Colaborador</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Selecione…</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.perfil})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Perfil efetivo no lab</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {PERFIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {getPerfilPolitica(role) && (
                <p className="rbac-perfil-hint" style={{ marginTop: 6 }}>
                  {getPerfilPolitica(role)!.desc}
                </p>
              )}
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={atribuir}>
            Atribuir
          </button>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Atribuições ativas (dental_lab)</h3>
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil efetivo</th>
              {podeEscrever && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.id}>
                <td>{g.usuarioNome ?? g.userId}</td>
                <td>{g.role}</td>
                {podeEscrever && (
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        await api.grupos.remove(g.id);
                        load();
                      }}
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={podeEscrever ? 3 : 2} style={{ textAlign: "center", color: "#64748b" }}>
                  Nenhuma atribuição extra (usa mapeamento padrão do perfil ERP)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
