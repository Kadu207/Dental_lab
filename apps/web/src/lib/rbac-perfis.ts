/** Políticas de perfil RBAC — exibidas no cadastro de colaboradores (não no login). */

export type PerfilPolitica = {
  id: string;
  label: string;
  desc: string;
  /** Perfis atribuíveis em Colaboradores (tenant) */
  atribuivelTenant: boolean;
};

export const RBAC_PERFIL_POLITICAS: PerfilPolitica[] = [
  {
    id: "supervisor",
    label: "Supervisor",
    desc: "Console Suporte MASTER (multi-tenant)",
    atribuivelTenant: false,
  },
  {
    id: "admin",
    label: "Administrador",
    desc: "Gestão completa do laboratório",
    atribuivelTenant: true,
  },
  {
    id: "gestor",
    label: "Gestor",
    desc: "Financeiro, equipe e cadastros",
    atribuivelTenant: true,
  },
  {
    id: "recepcao",
    label: "Recepção",
    desc: "Clientes, próteses e atendimento",
    atribuivelTenant: true,
  },
  {
    id: "laboratorio",
    label: "Laboratório",
    desc: "Produção, estoque e próteses",
    atribuivelTenant: true,
  },
  {
    id: "colaborador",
    label: "Colaborador",
    desc: "Operação diária limitada",
    atribuivelTenant: true,
  },
  {
    id: "estagiario",
    label: "Estagiário",
    desc: "Somente leitura em módulos básicos",
    atribuivelTenant: true,
  },
];

export const TENANT_PERFIL_OPTIONS = RBAC_PERFIL_POLITICAS.filter((p) => p.atribuivelTenant).map(
  (p) => ({ value: p.id, label: p.label }),
);

export function getPerfilPolitica(perfilId: string): PerfilPolitica | undefined {
  return RBAC_PERFIL_POLITICAS.find((p) => p.id === perfilId);
}
