import { RBAC_PERFIL_POLITICAS } from "../../lib/rbac-perfis";

type Props = {
  /** Destaca o perfil selecionado no formulário de cadastro */
  selectedPerfil?: string;
  /** Ocultar supervisor na lista (ex.: só tenant) */
  tenantOnly?: boolean;
};

export function RbacPerfilPoliticas({ selectedPerfil, tenantOnly }: Props) {
  const lista = tenantOnly
    ? RBAC_PERFIL_POLITICAS.filter((p) => p.atribuivelTenant)
    : RBAC_PERFIL_POLITICAS;

  return (
    <div className="rbac-politicas-card card">
      <h3 className="rbac-politicas-title">Perfis com RBAC</h3>
      <p className="page-desc" style={{ marginBottom: 12 }}>
        Escolha o perfil ao cadastrar o colaborador. Políticas customizadas podem ser ajustadas em
        &quot;Políticas&quot; por usuário.
      </p>
      <ul className="rbac-politicas-list">
        {lista.map((r) => (
          <li
            key={r.id}
            className={selectedPerfil === r.id ? "rbac-politicas-item is-selected" : "rbac-politicas-item"}
          >
            <span className="rbac-politicas-badge">{r.label}</span>
            <span className="rbac-politicas-desc">{r.desc}</span>
            {!r.atribuivelTenant && (
              <span className="rbac-politicas-note">Gerenciado no console supervisor</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
