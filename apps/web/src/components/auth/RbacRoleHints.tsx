import { RBAC_ROLE_HINTS } from "../../lib/auth-routes";

export function RbacRoleHints() {
  return (
    <div className="login-rbac-hints" aria-label="Perfis de acesso do sistema">
      <p className="login-rbac-title">Perfis com RBAC</p>
      <ul className="login-rbac-list">
        {RBAC_ROLE_HINTS.map((r) => (
          <li key={r.id}>
            <span className="login-rbac-badge">{r.label}</span>
            <span className="login-rbac-desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
