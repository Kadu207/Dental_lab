import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { IS_EMBEDDED, setLabSession } from "../lib/auth";
import { LoginShell } from "../components/LoginShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(
    (location.state as { senhaAlterada?: boolean } | null)?.senhaAlterada
      ? "Senha redefinida com sucesso. Faça login com a nova senha."
      : "",
  );
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
      });
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <form className="login-card login-card-glass" onSubmit={onSubmit}>
        <h2>Acesso ao sistema</h2>
        <p className="login-sub">Laboratório odontológico e gestão de próteses</p>
        <label>
          Usuário
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="login-forgot-row">
          <Link to="/esqueci-senha" className="login-link">
            Esqueceu a senha?
          </Link>
        </div>
        {sucesso ? <p className="login-success">{sucesso}</p> : null}
        {erro ? <p className="login-erro">{erro}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </LoginShell>
  );
}
