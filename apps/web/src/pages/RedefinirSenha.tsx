import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { LoginShell } from "../components/LoginShell";

export default function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string } | null)?.resetToken ?? "";
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  if (!resetToken) {
    return (
      <LoginShell logoSize={56}>
        <div className="login-card">
          <h2>Link inválido</h2>
          <p className="login-sub">Solicite a recuperação de senha novamente para continuar.</p>
          <Link to="/esqueci-senha" className="login-link" style={{ marginTop: 8 }}>
            Recuperar senha →
          </Link>
        </div>
      </LoginShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (novaSenha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      await api.auth.redefinirSenha(resetToken, novaSenha);
      navigate("/login", { replace: true, state: { senhaAlterada: true } });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível redefinir a senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell logoSize={56}>
      <form className="login-card" onSubmit={onSubmit}>
        <h2>Nova senha</h2>
        <p className="login-sub">Defina uma nova senha para acessar o sistema.</p>
        <label>
          Nova senha
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {erro ? <p className="login-erro">{erro}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
        <Link to="/login" className="login-link">
          ← Voltar ao login
        </Link>
      </form>
    </LoginShell>
  );
}
