export const FINANCEIRO_TIPOS = ["Entrada", "Saída", "Receita", "Despesa"] as const;
export const FINANCEIRO_STATUS = ["Pendente", "Recebido", "Pago", "Inadimplente", "Cancelado"] as const;

export type FinanceiroTipo = (typeof FINANCEIRO_TIPOS)[number];
export type FinanceiroStatus = (typeof FINANCEIRO_STATUS)[number];

export type FinanceiroListQuery = {
  status?: string;
  de?: string;
  ate?: string;
  pacienteId?: string;
  proteseId?: string;
};

export function isReceitaTipo(tipo: string): boolean {
  return tipo === "Entrada" || tipo === "Receita";
}

export function isDespesaTipo(tipo: string): boolean {
  return tipo === "Saída" || tipo === "Despesa";
}

/** Monta WHERE adicional (após clinica_id = ?) e params na ordem. */
export function buildFinanceiroFilters(q: FinanceiroListQuery): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (q.status && q.status !== "Todos") {
    parts.push("lower(status) = lower(?)");
    params.push(q.status);
  }
  if (q.de?.trim()) {
    parts.push("data_vencimento >= ?");
    params.push(q.de.trim());
  }
  if (q.ate?.trim()) {
    parts.push("data_vencimento <= ?");
    params.push(q.ate.trim());
  }
  if (q.pacienteId?.trim()) {
    parts.push("paciente_id = ?");
    params.push(q.pacienteId.trim());
  }
  if (q.proteseId?.trim()) {
    parts.push("protese_id = ?");
    params.push(q.proteseId.trim());
  }

  return {
    sql: parts.length ? ` AND ${parts.join(" AND ")}` : "",
    params,
  };
}

export function summarizeFinanceiro(
  rows: Array<{ tipo: string; valor: number; status?: string }>,
): { receitas: number; despesas: number; saldo: number; quantidade: number } {
  let receitas = 0;
  let despesas = 0;
  for (const r of rows) {
    if (r.status === "Cancelado") continue;
    const v = Number(r.valor) || 0;
    if (isReceitaTipo(r.tipo)) receitas += v;
    else if (isDespesaTipo(r.tipo)) despesas += v;
  }
  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    quantidade: rows.filter((r) => r.status !== "Cancelado").length,
  };
}
