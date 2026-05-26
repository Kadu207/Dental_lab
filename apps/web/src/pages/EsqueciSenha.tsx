import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { LoginShell } from "../components/LoginShell";

export default function EsqueciSenhaPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setInfo("");
    setLoading(true);
    try {
      const data = await api.auth.solicitarRecuperacaoSenha(usuario, email);
      if (data.resetToken) {
        navigate("/redefinir-senha", { replace: true, state: { resetToken: data.resetToken } });
        return;
      }
      setInfo(
        "Não foi possível validar usuário e e-mail. Verifique os dados ou solicite ao administrador o cadastro do e-mail em Colaboradores.",
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível processar a solicitação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell logoSize={56}>
      <form className="login-card" onSubmit={onSubmit}>
        <h2>Recuperar senha</h2>
        <p className="login-sub">
          Informe usuário e e-mail cadastrados no laboratório para redefinir sua senha.
        </p>
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
          E-mail cadastrado
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {erro ? <p className="login-erro">{erro}</p> : null}
        {info ? <p className="login-info">{info}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Verificando…" : "Continuar"}
        </button>
        <Link to="/login" className="login-link">
          ← Voltar ao login
        </Link>
      </form>
    </LoginShell>
  );
}
