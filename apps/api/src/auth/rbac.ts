import type { Request, Response, NextFunction } from "express";

export type LabPerfil =
  | "supervisor"
  | "admin"
  | "gestor"
  | "recepcao"
  | "laboratorio"
  | "colaborador"
  | "estagiario";

export type PermissaoAcao = "read" | "write" | "delete";

export interface UsuarioPermissao {
  resource: string;
  actions: PermissaoAcao[];
}

export const PERFIS_VALIDOS: LabPerfil[] = [
  "supervisor",
  "admin",
  "gestor",
  "recepcao",
  "laboratorio",
  "colaborador",
  "estagiario",
];

/** Perfis atribuíveis dentro de um tenant (sem supervisor). */
export const TENANT_PERFIS: LabPerfil[] = PERFIS_VALIDOS.filter((p) => p !== "supervisor");

/** Hierarquia: supervisor > admin > gestor > recepcao/colaborador > laboratorio > estagiario */
export const PERFIL_RANK: Record<LabPerfil, number> = {
  supervisor: 200,
  admin: 100,
  gestor: 80,
  recepcao: 60,
  colaborador: 55,
  laboratorio: 40,
  estagiario: 10,
};

export const PERFIL_LABELS: Record<LabPerfil, string> = {
  supervisor: "Supervisor",
  admin: "Administrador",
  gestor: "Gestor",
  recepcao: "Recepção",
  colaborador: "Colaborador",
  laboratorio: "Laboratório",
  estagiario: "Estagiário",
};

export function perfilRank(perfil: string): number {
  return PERFIL_RANK[perfil as LabPerfil] ?? 0;
}

export function isSupervisor(perfil: string): boolean {
  return perfil === "supervisor";
}

/** Actor só gerencia usuários com rank estritamente menor (supervisor isento). */
export function canManagePerfil(actor: LabPerfil, target: LabPerfil): boolean {
  if (actor === "supervisor") return target !== "supervisor";
  return perfilRank(actor) > perfilRank(target);
}

export const DEFAULT_POLICIES: Record<LabPerfil, UsuarioPermissao[]> = {
  supervisor: [{ resource: "*", actions: ["read", "write", "delete"] }],
  admin: [{ resource: "*", actions: ["read", "write", "delete"] }],
  gestor: [
    { resource: "empresa", actions: ["read", "write"] },
    { resource: "financeiro", actions: ["read", "write", "delete"] },
    { resource: "colaboradores", actions: ["read", "write"] },
    { resource: "grupos", actions: ["read", "write"] },
    { resource: "procedimentos", actions: ["read", "write", "delete"] },
    { resource: "clientes", actions: ["read", "write", "delete"] },
    { resource: "odontograma", actions: ["read", "write"] },
    { resource: "fornecedores", actions: ["read", "write", "delete"] },
    { resource: "estoque", actions: ["read", "write", "delete"] },
    { resource: "proteses", actions: ["read", "write", "delete"] },
    { resource: "config", actions: ["read", "write"] },
  ],
  recepcao: [
    { resource: "empresa", actions: ["read", "write"] },
    { resource: "financeiro", actions: ["read", "write"] },
    { resource: "colaboradores", actions: ["read"] },
    { resource: "procedimentos", actions: ["read", "write"] },
    { resource: "grupos", actions: ["read"] },
    { resource: "clientes", actions: ["read", "write", "delete"] },
    { resource: "odontograma", actions: ["read", "write"] },
    { resource: "fornecedores", actions: ["read", "write"] },
    { resource: "proteses", actions: ["read", "write"] },
    { resource: "estoque", actions: ["read"] },
    { resource: "config", actions: ["read", "write"] },
  ],
  colaborador: [
    { resource: "empresa", actions: ["read"] },
    { resource: "financeiro", actions: ["read"] },
    { resource: "procedimentos", actions: ["read"] },
    { resource: "clientes", actions: ["read", "write"] },
    { resource: "odontograma", actions: ["read", "write"] },
    { resource: "proteses", actions: ["read", "write"] },
    { resource: "estoque", actions: ["read"] },
  ],
  laboratorio: [
    { resource: "procedimentos", actions: ["read"] },
    { resource: "estoque", actions: ["read", "write"] },
    { resource: "proteses", actions: ["read", "write"] },
    { resource: "odontograma", actions: ["read"] },
    { resource: "fornecedores", actions: ["read"] },
    { resource: "config", actions: ["read"] },
  ],
  estagiario: [
    { resource: "clientes", actions: ["read"] },
    { resource: "odontograma", actions: ["read"] },
    { resource: "proteses", actions: ["read"] },
    { resource: "estoque", actions: ["read"] },
    { resource: "procedimentos", actions: ["read"] },
  ],
};

export function parsePermissoes(raw: string | null | undefined, perfil: string): UsuarioPermissao[] {
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as UsuarioPermissao[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fallback */
    }
  }
  const p = perfil as LabPerfil;
  return DEFAULT_POLICIES[p] ?? DEFAULT_POLICIES.estagiario;
}

export function canAccess(
  permissoes: UsuarioPermissao[],
  resource: string,
  action: PermissaoAcao,
): boolean {
  for (const p of permissoes) {
    if (p.resource === "*" && p.actions.includes(action)) return true;
    if (p.resource === resource && p.actions.includes(action)) return true;
  }
  return false;
}

export function requirePolicy(resource: string, action: PermissaoAcao) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ erro: "Não autenticado" });
    const perfil = req.auth.perfil as LabPerfil;
    const perms = req.auth.permissoes ?? parsePermissoes(null, perfil);
    if (!canAccess(perms, resource, action)) {
      return res.status(403).json({
        erro: "Sem permissão para esta ação",
        code: "FORBIDDEN",
        resource,
        action,
      });
    }
    next();
  };
}

export function requirePerfis(...allowed: LabPerfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ erro: "Não autenticado" });
    const perfil = req.auth.perfil as LabPerfil;
    if (!allowed.includes(perfil)) {
      return res.status(403).json({ erro: "Perfil sem acesso a este módulo", code: "FORBIDDEN" });
    }
    next();
  };
}

export function requireSupervisor() {
  return requirePerfis("supervisor");
}
