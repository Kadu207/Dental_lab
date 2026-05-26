import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UsuarioPermissao } from "../api";
import { isAuthenticated } from "../lib/auth";

interface SessionContextValue {
  permissoes: UsuarioPermissao[] | null;
  perfil: string | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  permissoes: null,
  perfil: null,
  loading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [permissoes, setPermissoes] = useState<UsuarioPermissao[] | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setPermissoes(null);
      setPerfil(null);
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((me) => {
        setPermissoes(me.permissoes ?? null);
        setPerfil(me.perfil);
      })
      .catch(() => {
        setPermissoes(null);
        setPerfil(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SessionContext.Provider value={{ permissoes, perfil, loading }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
