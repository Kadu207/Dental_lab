import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { IS_EMBEDDED, clearLabSession, isAuthenticated } from "../lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);
  const [authErro, setAuthErro] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated()) {
      setOk(false);
      return;
    }
    api.auth
      .me()
      .then(() => {
        if (!cancelled) {
          setAuthErro("");
          setOk(true);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        clearLabSession();
        setAuthErro(e instanceof Error ? e.message : "Sessão inválida");
        setOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, authErro: authErro || "Sessão expirada. Faça login novamente." }}
      />
    );
  }

  return <>{children}</>;
}
