import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../lib/SessionContext";

export default function SupervisorContaPage() {
  const { perfil } = useSession();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  if (perfil && perfil !== "supervisor") {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setErro("");

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.supervisor.changePassword(senhaAtual, novaSenha);
      setMsg(res.mensagem);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Minha conta · Supervisor</h2>
      </div>
      <p className="page-desc">Altere a senha da conta supervisor (acesso à plataforma Inova, fora dos tenants).</p>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group full">
            <label>Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="form-group full">
            <label>Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="form-group full">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="form-actions full">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando…" : "Alterar senha"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
