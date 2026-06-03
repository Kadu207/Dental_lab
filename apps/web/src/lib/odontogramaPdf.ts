/** Browser-only: jsPDF 4.x — exportação do odontograma */
import { jsPDF } from "jspdf";
import { CONDITIONS, CONDITION_MAP, toothName, type ToothState } from "./odontograma";

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function fmtDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  try {
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

export type OdontogramaPdfInput = {
  pacienteNome: string;
  pacienteId: string | number;
  imageDataUrl?: string | null;
  states: ToothState[];
  savedAt?: string | null;
};

export function exportOdontogramaPdf(opts: OdontogramaPdfInput): void {
  const { pacienteNome, pacienteId, imageDataUrl, states, savedAt } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Odontograma", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNome || `#${pacienteId}`}`, margin, 52);
  doc.text(`Salvo em: ${fmtDate(savedAt)}`, pageW - margin, 34, { align: "right" });
  doc.text(`Emitido em: ${fmtDate()}`, pageW - margin, 52, { align: "right" });
  y = 92;

  if (imageDataUrl) {
    const imgW = contentW;
    const imgH = imgW * 0.5;
    doc.setFillColor(12, 15, 26);
    doc.roundedRect(margin, y, imgW, imgH, 8, 8, "F");
    try {
      doc.addImage(imageDataUrl, "PNG", margin + 6, y + 6, imgW - 12, imgH - 12);
    } catch {
      /* ignore */
    }
    y += imgH + 24;
  }

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Legenda", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cols = 3;
  const colW = contentW / cols;
  CONDITIONS.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = margin + col * colW;
    const cy = y + row * 18;
    const [r, g, b] = hexToRgb(c.color);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(cx, cy - 8, 11, 11, 2, 2, "FD");
    doc.setTextColor(40, 40, 40);
    doc.text(c.label, cx + 17, cy + 1);
  });
  const legendRows = Math.ceil(CONDITIONS.length / cols);
  y += legendRows * 18 + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Dentes marcados (${states.length})`, margin, y);
  y += 18;

  if (states.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhuma marcação registrada.", margin, y);
  } else {
    doc.setFillColor(238, 240, 244);
    doc.rect(margin, y - 12, contentW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Dente", margin + 6, y);
    doc.text("Tipo", margin + 70, y);
    doc.text("Condição", margin + 160, y);
    doc.text("Observação", margin + 280, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    for (const s of states) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      const meta = CONDITION_MAP[s.condition];
      const [r, g, b] = hexToRgb(meta.color);
      doc.setFillColor(r, g, b);
      doc.setDrawColor(180, 180, 180);
      doc.roundedRect(margin + 6, y - 8, 9, 9, 2, 2, "FD");
      doc.setTextColor(30, 30, 30);
      doc.text(String(s.fdi), margin + 22, y);
      doc.text(toothName(s.fdi), margin + 70, y);
      doc.text(meta.label, margin + 160, y);
      const note = (s.note ?? "").trim();
      if (note) {
        const lines = doc.splitTextToSize(note, contentW - 286);
        doc.text(lines, margin + 280, y);
        y += Math.max(14, lines.length * 11);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("—", margin + 280, y);
        y += 14;
      }
    }
  }

  const fileName = `odontograma-${pacienteNome ? pacienteNome.replace(/\s+/g, "_") : pacienteId}.pdf`;
  doc.save(fileName);
}
