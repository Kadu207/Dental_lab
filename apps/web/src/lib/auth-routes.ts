/** Rota inicial após login conforme perfil RBAC */
export function getPostLoginPath(perfil: string): string {
  if (perfil === "supervisor") return "/supervisor/cadastro";
  return "/";
}

export const RBAC_ROLE_HINTS: { id: string; label: string; desc: string }[] = [
  { id: "supervisor", label: "Supervisor", desc: "Console Suporte MASTER (multi-tenant)" },
  { id: "admin", label: "Administrador", desc: "Gestão completa do laboratório" },
  { id: "gestor", label: "Gestor", desc: "Financeiro, equipe e cadastros" },
  { id: "recepcao", label: "Recepção", desc: "Clientes, próteses e atendimento" },
  { id: "laboratorio", label: "Laboratório", desc: "Produção, estoque e próteses" },
  { id: "colaborador", label: "Colaborador", desc: "Operação diária limitada" },
  { id: "estagiario", label: "Estagiário", desc: "Somente leitura em módulos básicos" },
];
