import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { IS_EMBEDDED, setLabSession } from "../lib/auth";
import { getPostLoginPath } from "../lib/auth-routes";
import { LoginShell } from "../components/LoginShell";
import { PasswordField } from "../components/auth/PasswordField";
import { RbacRoleHints } from "../components/auth/RbacRoleHints";
import { IconLogIn } from "../components/ui/Icons";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const loginState = location.state as { senhaAlterada?: boolean; authErro?: string } | null;
  const [sucesso, setSucesso] = useState(
    loginState?.senhaAlterada ? "Senha redefinida com sucesso. Faça login com a nova senha." : "",
  );
  const authErroInicial = loginState?.authErro ?? "";
  const [loading, setLoading] = useState(false);

  if (IS_EMBEDDED) {
    return (
      <LoginShell logoSize={56}>
        <div className="login-card">
          <h2>Módulo Laboratório</h2>
          <p className="login-sub">
            No modo integrado, faça login pelo Excellence Dental e abra esta área pelo menu Laboratório.
          </p>
        </div>
      </LoginShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);
    try {
      const data = await api.auth.login(usuario, senha);
      setLabSession({
        token: data.token,
        clinicaId: data.clinicaId,
        nome: data.nome,
        perfil: data.perfil,
        isPlatformUser: data.isPlatformUser ?? data.perfil === "supervisor",
      });
      navigate(getPostLoginPath(data.perfil), { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell wide>
      <div className="login-layout">
        <form className="login-card login-card-glass" onSubmit={onSubmit}>
          <h2>Acesso ao sistema</h2>
          <p className="login-sub">Autenticação com perfil RBAC — laboratório e console supervisor</p>
          <label className="login-field">
            <span className="login-field-label">Usuário</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
              placeholder="ex.: admin ou supervisor"
            />
          </label>
          <PasswordField
            label="Senha"
            value={senha}
            onChange={setSenha}
            autoComplete="current-password"
            required
          />
          <div className="login-forgot-row">
            <Link to="/esqueci-senha" className="login-link">
              Esqueceu a senha?
            </Link>
          </div>
          {sucesso ? <p className="login-success">{sucesso}</p> : null}
          {authErroInicial && !erro ? <p className="login-erro">{authErroInicial}</p> : null}
          {erro ? <p className="login-erro">{erro}</p> : null}
          <button type="submit" className="login-submit" disabled={loading}>
            <IconLogIn size={18} />
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <RbacRoleHints />
      </div>
    </LoginShell>
  );
}
