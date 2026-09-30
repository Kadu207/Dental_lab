import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UsuarioPermissao } from "../api";
import { isAuthenticated } from "../lib/auth";

interface SessionContextValue {
  permissoes: UsuarioPermissao[] | null;
  perfil: string | null;
  isPlatformUser: boolean;
  loading: boolean;
  setSession: (
    perms: UsuarioPermissao[] | null,
    perfil: string | null,
    isPlatformUser?: boolean,
  ) => void;
}

const SessionContext = createContext<SessionContextValue>({
  permissoes: null,
  perfil: null,
  isPlatformUser: false,
  loading: true,
  setSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [permissoes, setPermissoes] = useState<UsuarioPermissao[] | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [isPlatformUser, setIsPlatformUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setPermissoes(null);
      setPerfil(null);
      setIsPlatformUser(false);
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((me) => {
        setPermissoes(me.permissoes ?? null);
        setPerfil(me.perfil);
        setIsPlatformUser(Boolean(me.isPlatformUser));
      })
      .catch(() => {
        setPermissoes(null);
        setPerfil(null);
        setIsPlatformUser(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback(
    (perms: UsuarioPermissao[] | null, p: string | null, platform?: boolean) => {
      setPermissoes(perms);
      setPerfil(p);
      setIsPlatformUser(Boolean(platform));
    },
    [],
  );

  return (
    <SessionContext.Provider value={{ permissoes, perfil, isPlatformUser, loading, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
