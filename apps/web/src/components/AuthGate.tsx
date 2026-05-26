import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { IS_EMBEDDED, isAuthenticated } from "../lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setOk(false);
      return;
    }
    api.auth
      .me()
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, [location.pathname]);

  if (ok === null) {
    return (
      <div className="login-wrap">
        <p style={{ color: "var(--muted)" }}>Verificando sessão…</p>
      </div>
    );
  }

  if (!ok) {
    if (IS_EMBEDDED) {
      return (
        <div className="login-wrap">
          <p style={{ color: "var(--muted)" }}>
            Sessão do ERP não encontrada. Volte ao Excellence Dental e abra Laboratório novamente.
          </p>
        </div>
      );
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
