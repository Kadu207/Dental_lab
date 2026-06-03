import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { LoginShell } from "../components/LoginShell";
import { IconMail } from "../components/ui/Icons";

export default function EsqueciSenhaPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [smtpOk, setSmtpOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.auth
      .recuperarSenhaStatus()
      .then((s) => setSmtpOk(s.smtpConfigurado))
      .catch(() => setSmtpOk(null));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setInfo("");
    setDevLink("");
    setLoading(true);
    try {
      const data = await api.auth.solicitarRecuperacaoSenha(usuario, email);

      if (data.emailEnviado) {
        setInfo(
          "E-mail enviado. Abra sua caixa de entrada e clique no link para definir uma nova senha (válido por 15 minutos).",
        );
        return;
      }

      if (data.resetToken) {
        if (data.resetUrl) setDevLink(data.resetUrl);
        navigate("/redefinir-senha", {
          replace: true,
          state: { resetToken: data.resetToken },
        });
        return;
      }

      setInfo(
        data.mensagem ??
          "Se usuário e e-mail estiverem corretos, você receberá um link em breve. Verifique também o spam ou peça ao administrador para cadastrar seu e-mail em Colaboradores.",
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível processar a solicitação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell logoSize={56}>
      <form className="login-card login-card-glass" onSubmit={onSubmit}>
        <h2>Recuperar senha</h2>
        <p className="login-sub">
          Informe usuário e e-mail cadastrados. Enviaremos um link seguro para redefinir a senha
          {smtpOk === false ? " (configure SMTP na VPS para envio automático)." : "."}
        </p>
        <label className="login-field">
          <span className="login-field-label">Usuário</span>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="login-field">
          <span className="login-field-label">E-mail cadastrado</span>
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
        {devLink ? (
          <p className="login-hint">
            Dev (SMTP off):{" "}
            <a href={devLink} className="login-link">
              abrir link de redefinição
            </a>
          </p>
        ) : null}
        <button type="submit" className="login-submit" disabled={loading}>
          <IconMail size={18} />
          {loading ? "Enviando…" : "Enviar link por e-mail"}
        </button>
        <Link to="/login" className="login-link">
          ← Voltar ao login
        </Link>
      </form>
    </LoginShell>
  );
}
