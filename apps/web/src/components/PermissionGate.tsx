import type { ReactNode } from "react";
import { canAccess } from "../lib/permissions";
import { useSession } from "../lib/SessionContext";

type Props = {
  resource: string;
  action?: "read" | "write" | "delete";
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGate({ resource, action = "read", fallback = null, children }: Props) {
  const { permissoes, loading } = useSession();
  if (loading) return null;
  if (!canAccess(permissoes, resource, action)) return <>{fallback}</>;
  return <>{children}</>;
}
