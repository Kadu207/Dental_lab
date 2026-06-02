import { getAuthToken, getClinicaId, IS_EMBEDDED } from "./lib/auth";

/** Em embedded no Excellence, chamadas passam pelo BFF `/lab-api/` (licença injetada no FastAPI). */
function apiBase(): string {
  const configured = (import.meta.env.VITE_DENTAL_LAB_API_URL ?? "").replace(/\/$/, "");
  if (configured) return `${configured}/api`;
  if (IS_EMBEDDED) return "/lab-api";
  return "/api";
}

const BASE = apiBase();

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getAuthToken();
  if (token) h.Authorization = `Bearer ${token}`;
  const cid = getClinicaId();
  if (cid) h["X-Clinica-Id"] = cid;
  const key = import.meta.env.VITE_DENTAL_LAB_LICENSE_KEY?.trim();
  if (key) h["X-Dental-Lab-License"] = key;
  return h;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: optHeaders, ...rest } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(optHeaders as Record<string, string> | undefined),
    },
  });
  if (res.status === 304) {
    throw new Error("Resposta em cache inválida. Recarregue a página (Ctrl+Shift+R).");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }));
    throw new Error(err.erro ?? "Erro na requisição");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    status: () => request<{ authRequired: boolean; deploymentMode: string; loginDisponivel: boolean }>("/auth/status"),
    login: (usuario: string, senha: string, clinicaId?: number) =>
      request<{
        token: string;
        nome: string;
        perfil: string;
        clinicaId: number;
        isPlatformUser?: boolean;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ usuario, senha, clinicaId }),
      }),
    me: () =>
      request<{
        sub: string;
        perfil: string;
        clinicaId: number;
        modo: string;
        userId?: string;
        permissoes?: UsuarioPermissao[];
        isPlatformUser?: boolean;
      }>("/auth/me"),
    solicitarRecuperacaoSenha: (usuario: string, email: string, clinicaId?: number) =>
      request<{ ok: boolean; resetToken?: string; mensagem: string }>("/auth/recuperar-senha/solicitar", {
        method: "POST",
        body: JSON.stringify({ usuario, email, clinicaId }),
      }),
    redefinirSenha: (token: string, novaSenha: string) =>
      request<{ ok: boolean; mensagem: string }>("/auth/recuperar-senha/redefinir", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha }),
      }),
  },
  clientes: {
    list: () => request<Cliente[]>("/clientes"),
    create: (d: Partial<Cliente>) => request<Cliente>("/clientes", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Cliente>) => request<Cliente>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    remove: (id: string) => request<void>(`/clientes/${id}`, { method: "DELETE" }),
  },
  fornecedores: {
    list: () => request<Fornecedor[]>("/fornecedores"),
    create: (d: Partial<Fornecedor>) => request<Fornecedor>("/fornecedores", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Fornecedor>) => request<Fornecedor>(`/fornecedores/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    remove: (id: string) => request<void>(`/fornecedores/${id}`, { method: "DELETE" }),
  },
  estoque: {
    list: () => request<EstoqueItem[]>("/estoque"),
    alertas: () => request<EstoqueItem[]>("/estoque/alertas"),
    create: (d: Partial<EstoqueItem>) => request<EstoqueItem>("/estoque", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<EstoqueItem>) => request<EstoqueItem>(`/estoque/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    movimentar: (id: string, quantidade: number, tipo: "entrada" | "saida") =>
      request<EstoqueItem>(`/estoque/${id}/movimentar`, { method: "PATCH", body: JSON.stringify({ quantidade, tipo }) }),
    remove: (id: string) => request<void>(`/estoque/${id}`, { method: "DELETE" }),
  },
  proteses: {
    list: (setor?: string) =>
      request<Protese[]>(setor ? `/proteses?setor=${encodeURIComponent(setor)}` : "/proteses"),
    get: (id: string) => request<{ protese: Protese; historico: Historico[] }>(`/proteses/${id}`),
    create: (d: NovaProtese & { setor?: string }) =>
      request<{ protese: Protese; etiqueta: unknown }>("/proteses", { method: "POST", body: JSON.stringify(d) }),
    updateStatus: (id: string, status: string, observacao?: string) =>
      request<{ protese: Protese; historico: Historico[] }>(`/proteses/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, observacao }),
      }),
    updateSetor: (id: string, setor: string) =>
      request<{ protese: Protese }>(`/proteses/${id}/setor`, {
        method: "PATCH",
        body: JSON.stringify({ setor }),
      }),
    imprimirUrl: (id: string, tamanho = "termica_100x50") =>
      `${BASE}/proteses/${id}/imprimir?tamanho=${tamanho}`,
  },
  dashboard: {
    kpis: () => request<DashboardKpis>("/dashboard/kpis"),
  },
  relatorios: {
    producaoCsvUrl: (de?: string, ate?: string) => {
      const q = new URLSearchParams();
      if (de) q.set("de", de);
      if (ate) q.set("ate", ate);
      const qs = q.toString();
      return `${BASE}/relatorios/producao.csv${qs ? `?${qs}` : ""}`;
    },
    producaoHtmlUrl: (de?: string, ate?: string) => {
      const q = new URLSearchParams();
      if (de) q.set("de", de);
      if (ate) q.set("ate", ate);
      const qs = q.toString();
      return `${BASE}/relatorios/producao.html${qs ? `?${qs}` : ""}`;
    },
  },
  usuarios: {
    list: () => request<Colaborador[]>("/usuarios"),
    create: (d: { nome: string; senha: string; email?: string; perfil: string; descricao?: string }) =>
      request<Colaborador>("/usuarios", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Record<string, unknown>) =>
      request<Colaborador>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    updatePermissoes: (id: string, permissoes: UsuarioPermissao[]) =>
      request<{ msg: string }>(`/usuarios/${id}/permissoes`, {
        method: "PUT",
        body: JSON.stringify({ permissoes }),
      }),
    remove: (id: string) => request<void>(`/usuarios/${id}`, { method: "DELETE" }),
  },
  etiquetas: {
    campos: () => request<CampoEtiqueta[]>("/etiquetas/campos"),
    testeImpressaoUrl: (tamanho = "termica_100x50") =>
      `${BASE}/etiquetas/teste-impressao?tamanho=${tamanho}`,
  },
  scanner: {
    scan: (codigo: string) => request<ScanResult>("/scanner/scan", { method: "POST", body: JSON.stringify({ codigo }) }),
  },
  licencas: {
    status: (unidadeId?: string | null) =>
      request<Record<string, unknown>>(
        unidadeId ? `/licencas/status?unidade_id=${encodeURIComponent(unidadeId)}` : "/licencas/status",
      ),
    activate: (licenseKey: string, unidadeId?: string | null) =>
      request<{ msg: string; licenca: Record<string, unknown> }>("/licencas/ativar", {
        method: "POST",
        body: JSON.stringify({
          license_key: licenseKey,
          unidade_id: unidadeId ?? undefined,
        }),
      }),
    list: () => request<unknown[]>("/licencas"),
    generate: (payload: Record<string, unknown>) =>
      request<{ licenseKey: string }>("/licencas/gerar", { method: "POST", body: JSON.stringify(payload) }),
  },
  config: {
    getLab: () => request<LabConfig>("/config/lab"),
    saveLab: (d: LabConfig) => request<LabConfig>("/config/lab", { method: "PUT", body: JSON.stringify(d) }),
  },
  empresa: {
    get: () => request<EmpresaData>("/empresa"),
    save: (d: Partial<EmpresaData>) =>
      request<{ msg: string; empresa: EmpresaData }>("/empresa", { method: "POST", body: JSON.stringify(d) }),
    listUnidades: () => request<EmpresaUnidade[]>("/empresa/unidades"),
    createUnidade: (d: Partial<EmpresaUnidade>) =>
      request<EmpresaUnidade>("/empresa/unidades", { method: "POST", body: JSON.stringify(d) }),
    removeUnidade: (id: string) => request<void>(`/empresa/unidades/${id}`, { method: "DELETE" }),
  },
  financeiro: {
    list: (status?: string) => {
      const q = status && status !== "Todos" ? `?status=${encodeURIComponent(status)}` : "";
      return request<FinanceiroLancamento[]>(`/financeiro${q}`);
    },
    create: (d: Partial<FinanceiroLancamento>) =>
      request<FinanceiroLancamento>("/financeiro", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<FinanceiroLancamento>) =>
      request<FinanceiroLancamento>(`/financeiro/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    remove: (id: string) => request<void>(`/financeiro/${id}`, { method: "DELETE" }),
  },
  procedimentos: {
    list: () => request<Procedimento[]>("/procedimentos"),
    create: (d: Partial<Procedimento>) =>
      request<Procedimento>("/procedimentos", { method: "POST", body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Procedimento>) =>
      request<Procedimento>(`/procedimentos/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    remove: (id: string) => request<void>(`/procedimentos/${id}`, { method: "DELETE" }),
  },
  grupos: {
    me: () =>
      request<{
        userId: string;
        perfil: string;
        roleEfetivo: string;
        permissoes: UsuarioPermissao[];
      }>("/grupos/me"),
    list: () => request<GrupoAtribuicao[]>("/grupos/permissoes"),
    assign: (userId: string, role: string) =>
      request<{ msg: string }>("/grupos/permissoes", { method: "POST", body: JSON.stringify({ userId, role }) }),
    remove: (id: string) => request<void>(`/grupos/permissoes/${id}`, { method: "DELETE" }),
  },
  supervisor: {
    listTenants: () => request<TenantRecord[]>("/supervisor/tenants"),
    getTenant: (clinicaId: number) => request<TenantRecord>(`/supervisor/tenants/${clinicaId}`),
    createTenant: (data: Partial<TenantRecord>) =>
      request<TenantRecord>("/supervisor/tenants", { method: "POST", body: JSON.stringify(data) }),
    updateTenant: (clinicaId: number, data: Partial<TenantRecord>) =>
      request<TenantRecord>(`/supervisor/tenants/${clinicaId}`, { method: "PUT", body: JSON.stringify(data) }),
    licenseStatus: (clinicaId: number) =>
      request<TenantLicenseStatus>(`/supervisor/tenants/${clinicaId}/licenca/status`),
    listLicenses: (clinicaId: number) => request<TenantLicenseRow[]>(`/supervisor/tenants/${clinicaId}/licencas`),
    generateLicense: (
      clinicaId: number,
      data: { produto?: string; periodo?: string; clienteNome?: string; notes?: string },
    ) =>
      request<TenantLicenseRow>(`/supervisor/tenants/${clinicaId}/licencas/gerar`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    changePassword: (senhaAtual: string, novaSenha: string) =>
      request<{ ok: boolean; mensagem: string }>("/supervisor/conta/senha", {
        method: "PUT",
        body: JSON.stringify({ senhaAtual, novaSenha }),
      }),
  },
};

export interface Cliente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  contato?: string;
  endereco?: string;
  observacoes?: string;
}

export interface EstoqueItem {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  quantidadeMinima: number;
  fornecedorId?: string;
  precoUnitario?: number;
  localizacao?: string;
}

export interface Protese {
  id: string;
  codigo: string;
  codigoBarras: string;
  pacienteId: string;
  paciente: Cliente;
  dentista: { nome: string; cro?: string; clinica?: string };
  tipoProtese: string;
  dentes?: string;
  cor?: string;
  material?: string;
  observacoes?: string;
  dataEntrada: string;
  dataPrevistaEntrega?: string;
  status: string;
  setor?: string;
  createdAt: string;
}

export interface NovaProtese {
  pacienteId: string;
  dentistaNome: string;
  dentistaCro?: string;
  dentistaClinica?: string;
  tipoProtese: string;
  dentes?: string;
  cor?: string;
  material?: string;
  observacoes?: string;
  dataEntrada?: string;
  dataPrevistaEntrega?: string;
  setor?: string;
}

export interface Historico {
  id: string;
  status: string;
  observacao?: string;
  createdAt: string;
}

export interface LabConfig {
  nome: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
  tamanhoEtiquetaPadrao?: TamanhoEtiqueta;
}

export type TamanhoEtiqueta = "termica_100x50" | "termica_50x30" | "a4";

export interface Colaborador {
  id: string;
  nome: string;
  email?: string;
  perfil: string;
  perfilLab?: string;
  ativo: boolean;
  descricao?: string;
  permissoes?: UsuarioPermissao[] | null;
  createdAt?: string;
  origem?: string;
}

export interface DashboardKpis {
  total: number;
  hojeEntrada: number;
  atrasados: number;
  prontos: number;
  porStatus: Record<string, number>;
  porSetor: Record<string, number>;
  estoqueAlertas: number;
  geradoEm: string;
}

export interface CampoEtiqueta {
  campo: string;
  origem: string;
  fallback: string | null;
  tipo?: string;
}

export interface ScanResult {
  encontrado: boolean;
  protese: {
    id: string;
    codigo: string;
    paciente: string;
    dentista: string;
    tipoProtese: string;
    status: string;
    statusLabel: string;
    proximoStatus: string | null;
    proximoStatusLabel: string | null;
  };
  historico: { status: string; statusLabel: string; observacao?: string; createdAt: string }[];
}

/** RBAC (API + UI) */
export interface UsuarioPermissao {
  resource: string;
  actions: ("read" | "write" | "delete")[];
}

export interface EmpresaData {
  clinicaId?: number;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cpf?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  redeSocial?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  nomeResponsavel?: string;
  contatoResponsavel?: string;
  updatedAt?: string;
}

export interface EmpresaUnidade {
  id: string;
  nome: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  ativo?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  createdAt?: string;
}

export interface FinanceiroLancamento {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: string;
  formaPagamento?: string;
  createdAt?: string;
}

export interface Procedimento {
  id: string;
  nome: string;
  valor: number;
  custoEstimado: number;
  geraComissao: string;
  comissaoPerc: number;
  margemEstimada?: number;
  createdAt?: string;
}

export interface GrupoAtribuicao {
  id: string;
  userId: string;
  usuarioNome?: string;
  role: string;
  createdAt?: string;
}

export interface TenantRecord {
  clinicaId: number;
  postgresSchema: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  clienteCodigo: string | null;
  status: "active" | "suspended" | "provisioning";
  createdAt: string;
  updatedAt: string;
}

export interface TenantLicenseRow {
  id: number;
  licenseKey: string;
  clinicaId: number | null;
  unidadeId: string | null;
  produto: string;
  produtoLabel: string;
  periodo: string;
  periodoLabel: string;
  clienteNome: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  createdBy: string;
  notes: string;
}

export interface TenantLicenseStatus {
  tenant: TenantRecord;
  localStatus: Record<string, unknown>;
  remoteStatus: Record<string, unknown> | null;
  remoteError: string | null;
  remoteEnabled: boolean;
  geradorUrl: string;
}

export const STATUS_LABELS: Record<string, string> = {
  recebido: "Recebido",
  em_producao: "Em Produção",
  prova: "Prova",
  acabamento: "Acabamento",
  pronto: "Pronto",
  entregue: "Entregue",
};
