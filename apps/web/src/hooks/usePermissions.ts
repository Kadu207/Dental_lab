import { useCallback, useState } from "react";
import { api } from "../api";
import { getLabUser } from "../lib/auth";
import { useSession } from "../lib/SessionContext";

export type RbacAction = "read" | "write" | "delete";

export function usePermissions() {
  const { permissoes, perfil, loading, setSession } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const isSupervisor = perfil === "supervisor";

  const can = useCallback(
    (resource: string, action: RbacAction): boolean => {
      if (isSupervisor) return true;
      if (!permissoes?.length) return false;
      return permissoes.some(
        (p) => (p.resource === "*" || p.resource === resource) && p.actions.includes(action),
      );
    },
    [permissoes, isSupervisor],
  );

  const refetch = useCallback(async () => {
    setRefreshing(true);
    try {
      const me = await api.auth.me();
      setSession(me.permissoes ?? null, me.perfil);
      return me;
    } finally {
      setRefreshing(false);
    }
  }, [setSession]);

  return {
    permissoes,
    perfil: perfil ?? getLabUser()?.perfil ?? null,
    isSupervisor,
    isLoading: loading,
    isFetching: refreshing,
    can,
    refetch,
  };
}
