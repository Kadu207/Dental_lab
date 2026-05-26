import bwipjs from "bwip-js";
import { randomUUID } from "crypto";
import type {
  EtiquetaCampos,
  EtiquetaImpressao,
  EtiquetaVia,
  LabConfig,
  ProteseRegistro,
  TamanhoEtiqueta,
  ViaTipo,
} from "./types.js";

const VIA_META: Record<ViaTipo, { titulo: string; tituloCurto: string; cls: string }> = {
  laboratorio: { titulo: "VIA 1 — LABORATÓRIO", tituloCurto: "VIA 1 — LAB", cls: "via-lab" },
  clinica: { titulo: "VIA 2 — CLÍNICA", tituloCurto: "VIA 2 — CLÍNICA", cls: "via-clinica" },
  paciente: { titulo: "VIA 3 — PACIENTE", tituloCurto: "VIA 3 — PACIENTE", cls: "via-paciente" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function buildNomeAmostra(protese: ProteseRegistro): string {
  const partes = [protese.tipoProtese];
  if (protese.dentes) partes.push(`Elemento ${protese.dentes}`);
  else if (protese.cor) partes.push(protese.cor);
  return partes.join(" — ");
}

/** Monta os 7 campos oficiais da etiqueta conforme especificação */
export function buildCamposEtiqueta(protese: ProteseRegistro, lab: LabConfig): EtiquetaCampos {
  return {
    logoUrl: lab.logoUrl,
    nomeEmpresa: lab.nome,
    paciente: protese.paciente.nome,
    telefone: protese.paciente.telefone,
    numeroAmostra: protese.codigo,
    nomeAmostra: buildNomeAmostra(protese),
    data: formatDate(protese.dataEntrada),
  };
}

function buildCampos(protese: ProteseRegistro, lab: LabConfig): EtiquetaCampos {
  return buildCamposEtiqueta(protese, lab);
}

export function gerarCodigoProtese(seq?: number): { codigo: string; codigoBarras: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const s = String(seq ?? Math.floor(Math.random() * 9999)).padStart(4, "0");
  const codigo = `PROT-${y}${m}${d}-${s}`;
  return { codigo, codigoBarras: codigo };
}

export async function gerarCodigoBarrasSvg(
  texto: string,
  tamanho: TamanhoEtiqueta
): Promise<string> {
  const compacto = tamanho === "termica_50x30";
  // Altura em mm (bwip-js): ~10 mm em 100×50 — leitura confiável em 203 dpi
  return bwipjs.toSVG({
    bcid: "code128",
    text: texto,
    scale: compacto ? 1 : 2,
    height: compacto ? 6 : 10,
    includetext: false,
    paddingwidth: compacto ? 4 : 8,
    paddingheight: 2,
  });
}

export function criarRegistroProtese(
  dados: Omit<ProteseRegistro, "id" | "codigo" | "codigoBarras" | "createdAt"> & {
    id?: string;
    codigo?: string;
    codigoBarras?: string;
  }
): ProteseRegistro {
  const { codigo, codigoBarras } =
    dados.codigo && dados.codigoBarras
      ? { codigo: dados.codigo, codigoBarras: dados.codigoBarras }
      : gerarCodigoProtese();

  return {
    ...dados,
    id: dados.id ?? randomUUID(),
    codigo,
    codigoBarras,
    createdAt: new Date().toISOString(),
  };
}

export async function gerarEtiquetas3Vias(
  protese: ProteseRegistro,
  tamanho: TamanhoEtiqueta = "termica_100x50",
  lab: LabConfig = { nome: "Laboratório Dental" }
): Promise<EtiquetaImpressao> {
  const codigoBarrasSvg = await gerarCodigoBarrasSvg(protese.codigoBarras, tamanho);
  const campos = buildCampos(protese, lab);
  const compacto = tamanho === "termica_50x30";

  const vias: EtiquetaVia[] = (["laboratorio", "clinica", "paciente"] as ViaTipo[]).map(
    (via) => ({
      via,
      titulo: compacto ? VIA_META[via].tituloCurto : VIA_META[via].titulo,
      subtitulo: VIA_META[via].cls,
      campos,
    })
  );

  return {
    proteseId: protese.id,
    codigo: protese.codigo,
    codigoBarras: protese.codigoBarras,
    codigoBarrasSvg,
    vias,
    tamanho,
  };
}

function renderLogo(logoUrl: string | undefined, nomeEmpresa: string): string {
  if (logoUrl) {
    return `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />`;
  }
  const iniciais = nomeEmpresa
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return `<div class="logo">${escapeHtml(iniciais)}</div>`;
}

function truncar(texto: string, max: number): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function linha(lbl: string, val: string, cls = "", extra = ""): string {
  return `<div class="linha ${extra}"><span class="lbl">${escapeHtml(lbl)}</span><span class="val ${cls}">${escapeHtml(val)}</span></div>`;
}

/** Modelo oficial 100×50 mm — coluna única (igual preview-etiqueta.html) */
function renderVia100x50(v: EtiquetaVia, barcodeSvg: string, codigo: string): string {
  const c = v.campos;
  const cls = v.subtitulo || `via-${v.via}`;

  return `
    <div class="etiqueta etiqueta-100x50 ${cls}">
      <div class="faixa-via">${escapeHtml(v.titulo)}</div>
      <div class="corpo">
        <div class="conteudo">
          <div class="header">
            ${renderLogo(c.logoUrl, c.nomeEmpresa)}
            <div class="empresa-nome">${escapeHtml(truncar(c.nomeEmpresa, 42))}</div>
          </div>
          <div class="campos-list">
            ${linha("Paciente", truncar(c.paciente, 38))}
            ${linha("Telefone", c.telefone ?? "—")}
            ${linha("Nº Amostra", c.numeroAmostra, "codigo-amostra")}
            ${linha("Nome Amostra", truncar(c.nomeAmostra, 48), "", "linha-amostra")}
            ${linha("Data", c.data)}
          </div>
        </div>
        <div class="barcode">
          ${barcodeSvg}
          <div class="barcode-text">${escapeHtml(codigo)}</div>
        </div>
      </div>
    </div>`;
}

function renderVia50x30(v: EtiquetaVia, barcodeSvg: string, codigo: string): string {
  const c = v.campos;
  const cls = v.subtitulo || `via-${v.via}`;

  return `
    <div class="etiqueta etiqueta-50x30 ${cls}">
      <div class="faixa-via">${escapeHtml(v.titulo)}</div>
      <div class="corpo">
        <div class="header">
          ${renderLogo(c.logoUrl, c.nomeEmpresa)}
          <div class="empresa-nome">${escapeHtml(c.nomeEmpresa)}</div>
        </div>
        <div class="grid-compacto">
          ${linha("Pac.", c.paciente)}
          ${c.telefone ? linha("Tel.", c.telefone) : ""}
          ${linha("Nº", c.numeroAmostra, "codigo-amostra")}
          ${linha("Data", c.data)}
        </div>
        <div class="amostra">${escapeHtml(c.nomeAmostra)}</div>
        <div class="barcode">${barcodeSvg}<div class="barcode-text">${escapeHtml(codigo)}</div></div>
      </div>
    </div>`;
}

function renderVia(v: EtiquetaVia, barcodeSvg: string, tamanho: TamanhoEtiqueta, codigo: string): string {
  if (tamanho === "termica_50x30") return renderVia50x30(v, barcodeSvg, codigo);
  return renderVia100x50(v, barcodeSvg, codigo);
}

/** CSS oficial 100×50 mm — calibrado para térmica 203 dpi (ex.: Zebra ZD230) */
export const CSS_ETIQUETA_100x50 = `
  .etiqueta-100x50 {
    width: 100mm;
    height: 50mm;
    max-width: 100mm;
    max-height: 50mm;
    background: #fff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .etiqueta-100x50 .faixa-via {
    font-size: 6.5pt;
    padding: 0.8mm 2mm;
    flex-shrink: 0;
    color: #fff;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.2px;
    line-height: 1.1;
  }
  .via-lab .faixa-via, .via-laboratorio .faixa-via { background: #1e3a5f; }
  .via-clinica .faixa-via { background: #2d6a4f; }
  .via-paciente .faixa-via { background: #7b2cbf; }
  .etiqueta-100x50 .corpo {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.2mm 2.5mm 0.8mm;
    font-size: 7.5pt;
    min-height: 0;
  }
  .etiqueta-100x50 .conteudo { flex: 1; min-height: 0; overflow: hidden; }
  .etiqueta-100x50 .header {
    display: flex;
    align-items: center;
    gap: 1.5mm;
    margin-bottom: 0.6mm;
    padding-bottom: 0.6mm;
    border-bottom: 0.25mm solid #ccc;
  }
  .etiqueta-100x50 .logo {
    width: 10mm;
    height: 10mm;
    font-size: 8pt;
    background: #1e3a5f;
    color: #fff;
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex-shrink: 0;
    object-fit: contain;
  }
  .etiqueta-100x50 img.logo { background: transparent; max-width: 10mm; max-height: 10mm; }
  .etiqueta-100x50 .empresa-nome {
    font-size: 8.5pt;
    font-weight: 700;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .etiqueta-100x50 .campos-list { margin-top: 0.3mm; }
  .etiqueta-100x50 .linha {
    display: flex;
    gap: 1mm;
    line-height: 1.25;
    margin-bottom: 0.25mm;
    align-items: flex-start;
  }
  .etiqueta-100x50 .lbl {
    font-weight: 600;
    color: #333;
    min-width: 19mm;
    flex-shrink: 0;
    font-size: 7pt;
  }
  .etiqueta-100x50 .lbl::after { content: ':'; }
  .etiqueta-100x50 .val {
    color: #000;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .etiqueta-100x50 .linha-amostra .val {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.2;
  }
  .etiqueta-100x50 .codigo-amostra {
    font-family: 'Consolas', 'Courier New', monospace;
    font-weight: 700;
    font-size: 7.5pt;
    letter-spacing: 0.2px;
  }
  .etiqueta-100x50 .barcode {
    flex-shrink: 0;
    text-align: center;
    background: #f4f6f8;
    padding: 0.6mm 1mm 0.4mm;
    margin-top: auto;
  }
  .etiqueta-100x50 .barcode svg {
    display: block;
    margin: 0 auto;
    width: 92mm;
    height: 10mm;
    max-width: 92mm;
    max-height: 10mm;
  }
  .etiqueta-100x50 .barcode-text {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: 0.4px;
    margin-top: 0.3mm;
    line-height: 1;
  }
`;

const CSS_PRINT_100x50 = `
  @page { size: 100mm 50mm; margin: 0; }
  html, body { margin: 0; padding: 0; width: 100mm; }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .etiqueta-100x50 {
    page-break-after: always;
    border: none;
    box-shadow: none;
    outline: none;
  }
  .etiqueta-100x50:last-child { page-break-after: auto; }
  .etiqueta-100x50 .barcode { background: #fff; padding: 0.5mm 0 0; }
  .etiqueta-100x50 .header { border-bottom-color: #999; }
  ${CSS_ETIQUETA_100x50}
`;

const CSS_50x30 = `
  @page { size: 50mm 30mm; margin: 0; }
  body { margin: 0; padding: 0; }
  .etiqueta-50x30 {
    width: 50mm; height: 30mm; background: #fff;
    overflow: hidden; page-break-after: always;
    display: flex; flex-direction: column;
  }
  .etiqueta-50x30:last-child { page-break-after: auto; }
  .etiqueta-50x30 .faixa-via { font-size: 4.5pt; padding: 0.5mm 1mm; color: #fff; font-weight: 700; text-align: center; }
  .etiqueta-50x30 .corpo { padding: 0.8mm 1.2mm; font-size: 5.5pt; flex: 1; }
  .etiqueta-50x30 .header { display: flex; align-items: center; gap: 1mm; margin-bottom: 0.5mm; }
  .etiqueta-50x30 .logo {
    width: 7mm; height: 7mm; font-size: 5pt; border-radius: 1mm;
    background: #1e3a5f; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 800;
  }
  .etiqueta-50x30 .grid-compacto { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.5mm; }
  .etiqueta-50x30 .linha { display: flex; gap: 1mm; line-height: 1.2; margin-bottom: 0.2mm; }
  .etiqueta-50x30 .lbl { font-size: 5pt; font-weight: 600; color: #444; }
  .etiqueta-50x30 .lbl::after { content: ':'; }
  .etiqueta-50x30 .barcode { text-align: center; background: #f8f9fa; margin-top: 0.3mm; padding: 0.3mm; }
  .etiqueta-50x30 .barcode svg { max-height: 6mm; width: 95%; margin: 0 auto; display: block; }
`;

const CSS_A4 = `
  @page { size: A4; margin: 10mm; }
  .etiqueta-100x50 { margin-bottom: 5mm; border: 0.3mm solid #333; page-break-inside: avoid; }
`;

const CSS_BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; }
  .toolbar {
    padding: 12px 16px; background: #f0f4f8; border-bottom: 1px solid #ccc;
    display: flex; gap: 12px; align-items: center;
  }
  .toolbar button {
    padding: 8px 20px; background: #1e3a5f; color: #fff;
    border: none; border-radius: 4px; cursor: pointer; font-size: 14px;
  }
  .toolbar .print-hint {
    flex: 1 1 100%;
    margin: 8px 0 0;
    font-size: 12px;
    color: #475569;
    line-height: 1.4;
  }
  @media print { .toolbar { display: none !important; } }
`;

const CSS_MAP: Record<TamanhoEtiqueta, string> = {
  termica_100x50: CSS_PRINT_100x50,
  termica_50x30: CSS_50x30 + CSS_BASE.replace("@media print { .toolbar { display: none !important; } }", ""),
  a4: CSS_PRINT_100x50 + CSS_A4,
};

export function renderHtmlImpressao(
  etiqueta: EtiquetaImpressao,
  lab: LabConfig = { nome: "Laboratório Dental" }
): string {
  const blocos = etiqueta.vias
    .map((v) => renderVia(v, etiqueta.codigoBarrasSvg, etiqueta.tamanho, etiqueta.codigo))
    .join("\n");

  const tamanhoLabel = etiqueta.tamanho === "termica_50x30" ? "50×30 mm" : "100×50 mm";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Etiquetas ${tamanhoLabel} — ${escapeHtml(etiqueta.codigo)}</title>
  <style>${CSS_BASE}${CSS_MAP[etiqueta.tamanho]}</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir 3 vias (${tamanhoLabel})</button>
    <span>Trabalho: <strong>${escapeHtml(etiqueta.codigo)}</strong> — ${escapeHtml(lab.nome)}</span>
    ${
      etiqueta.tamanho === "termica_100x50"
        ? `<p class="print-hint">Térmica 100×50: escala <strong>100%</strong>, margens <strong>nenhuma</strong>, papel personalizado 100×50 mm. Driver Zebra: orientação paisagem, desligar “ajustar à página”. Ver IMPRESSORA-ETIQUETAS.md.</p>`
        : ""
    }
  </div>
  ${blocos}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type {
  Cliente,
  Dentista,
  ProteseRegistro,
  EtiquetaImpressao,
  EtiquetaCampos,
  ViaTipo,
  LabConfig,
  TamanhoEtiqueta,
  Fornecedor,
  EstoqueItem,
  StatusProtese,
  StatusHistorico,
} from "./types.js";
export { STATUS_LABELS, STATUS_FLOW } from "./types.js";
