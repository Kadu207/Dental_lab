/** Tipos compartilhados — exportáveis para integração com sistema de clínica */

export type ViaTipo = "laboratorio" | "clinica" | "paciente";

export type StatusProtese =
  | "recebido"
  | "em_producao"
  | "prova"
  | "acabamento"
  | "pronto"
  | "entregue";

export type TamanhoEtiqueta = "termica_50x30" | "termica_100x50" | "a4";

export interface LabConfig {
  nome: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  createdAt?: string;
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
  createdAt?: string;
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
  createdAt?: string;
}

export interface Dentista {
  id: string;
  nome: string;
  cro?: string;
  clinica?: string;
  telefone?: string;
}

export interface ProteseRegistro {
  id: string;
  codigo: string;
  codigoBarras: string;
  pacienteId: string;
  paciente: Cliente;
  dentista: Dentista;
  tipoProtese: string;
  dentes?: string;
  cor?: string;
  material?: string;
  observacoes?: string;
  dataEntrada: string;
  dataPrevistaEntrega?: string;
  status: StatusProtese;
  createdAt: string;
}

export interface StatusHistorico {
  id: string;
  proteseId: string;
  status: StatusProtese;
  observacao?: string;
  createdAt: string;
}

/** Campos da etiqueta — layout definido pelo cliente */
export interface EtiquetaCampos {
  /** Logo da empresa (URL ou base64) */
  logoUrl?: string;
  nomeEmpresa: string;
  paciente: string;
  telefone?: string;
  /** Nº da amostra (código do trabalho) */
  numeroAmostra: string;
  /** Nome da amostra (tipo de prótese / trabalho) */
  nomeAmostra: string;
  data: string;
}

export interface EtiquetaVia {
  via: ViaTipo;
  titulo: string;
  subtitulo: string;
  campos: EtiquetaCampos;
}

export interface EtiquetaImpressao {
  proteseId: string;
  codigo: string;
  codigoBarras: string;
  codigoBarrasSvg: string;
  vias: EtiquetaVia[];
  tamanho: TamanhoEtiqueta;
}

export const STATUS_LABELS: Record<StatusProtese, string> = {
  recebido: "Recebido",
  em_producao: "Em Produção",
  prova: "Prova",
  acabamento: "Acabamento",
  pronto: "Pronto",
  entregue: "Entregue",
};

export const STATUS_FLOW: StatusProtese[] = [
  "recebido",
  "em_producao",
  "prova",
  "acabamento",
  "pronto",
  "entregue",
];
