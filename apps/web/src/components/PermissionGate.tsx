import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions, type RbacAction } from "../hooks/usePermissions";

type Props = {
  resource: string;
  action?: RbacAction;
  silent?: boolean;
  redirectOnDeny?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGate({
  resource,
  action = "read",
  silent = false,
  redirectOnDeny = true,
  fallback,
  children,
}: Props) {
  const { can, isLoading, isFetching, refetch } = usePermissions();
  const navigate = useNavigate();

  const denied = !isLoading && !can(resource, action);
  const shouldRedirect = denied && !silent && !fallback && redirectOnDeny;

  useEffect(() => {
    if (shouldRedirect) {
      const params = new URLSearchParams({ recurso: resource, acao: action });
      navigate(`/sem-acesso?${params.toString()}`, { replace: true });
    }
  }, [shouldRedirect, resource, action, navigate]);

  if (isLoading) {
    return <p style={{ color: "var(--muted)", padding: "2rem 0" }}>Verificando permissões…</p>;
  }

  if (denied) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;
    return <p style={{ color: "var(--muted)", padding: "2rem 0" }}>Redirecionando…</p>;
  }

  return <>{children}</>;
}

export function PermissionGateError({
  onRetry,
  busy,
}: {
  onRetry: () => void;
  busy?: boolean;
}) {
  return (
    <div className="card" style={{ maxWidth: 420, margin: "2rem auto", textAlign: "center" }}>
      <h3 style={{ marginBottom: 8 }}>Falha ao carregar permissões</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 16 }}>
        Não foi possível validar seu acesso. Verifique a conexão e tente novamente.
      </p>
      <button type="button" className="btn btn-purple" onClick={onRetry} disabled={busy}>
        {busy ? "Recarregando…" : "Recarregar permissões"}
      </button>
    </div>
  );
}
