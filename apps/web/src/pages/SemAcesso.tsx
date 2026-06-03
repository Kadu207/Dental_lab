import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ActionButton } from "../components/ui/ActionButton";
import { usePermissions } from "../hooks/usePermissions";

const acaoLabel: Record<string, string> = {
  read: "visualizar",
  write: "criar ou editar",
  delete: "remover",
};

export default function SemAcessoPage() {
  const [params] = useSearchParams();
  const recurso = params.get("recurso") ?? undefined;
  const acao = params.get("acao") ?? undefined;
  const navigate = useNavigate();
  const { isFetching, refetch } = usePermissions();

  const handleReload = async () => {
    await refetch();
    navigate("/", { replace: true });
  };

  return (
    <div className="sem-acesso-wrap">
      <div className="card sem-acesso-card">
        <div className="sem-acesso-icon" aria-hidden>
          🔒
        </div>
        <h2>Acesso restrito</h2>
        <p className="sem-acesso-text">
          Seu perfil não possui permissão para {acao ? acaoLabel[acao] ?? acao : "acessar"}{" "}
          {recurso ? (
            <>
              o recurso <strong>{recurso}</strong>
            </>
          ) : (
            "este recurso"
          )}
          . Fale com um administrador se precisar de acesso.
        </p>
        <div className="sem-acesso-actions">
          <Link to="/">
            <ActionButton variant="purple">Voltar ao início</ActionButton>
          </Link>
          <ActionButton variant="outline" onClick={handleReload} disabled={isFetching}>
            {isFetching ? "Recarregando…" : "Recarregar permissões"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
