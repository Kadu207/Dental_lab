/** Browser-only: jsPDF 4.x (sem leitura de paths locais; CVE dompurify resolvido). */
import { jsPDF } from "jspdf";
import { CONDITION_MAP, type ToothState } from "./odontograma";

export type OdontogramaPdfInput = {
  pacienteNome: string;
  pacienteId: string;
  imageDataUrl?: string;
  states: ToothState[];
  savedAt?: string;
};

export function exportOdontogramaPdf(input: OdontogramaPdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Odontograma — Dental Lab", margin, 18);
  y = 36;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Paciente: ${input.pacienteNome}`, margin, y);
  y += 6;
  doc.text(`ID: ${input.pacienteId}`, margin, y);
  y += 6;
  if (input.savedAt) {
    doc.text(`Salvo em: ${new Date(input.savedAt).toLocaleString("pt-BR")}`, margin, y);
    y += 8;
  }

  if (input.imageDataUrl) {
    try {
      doc.addImage(input.imageDataUrl, "PNG", margin, y, 180, 70);
      y += 78;
    } catch {
      y += 4;
    }
  }

  doc.setFontSize(10);
  doc.text("Legenda", margin, y);
  y += 5;
  const marked = input.states.filter((s) => s.condition !== "sadio" || s.note?.trim());
  for (const s of marked.slice(0, 40)) {
    const c = CONDITION_MAP[s.condition];
    doc.setFillColor(c.color);
    doc.rect(margin, y - 3, 4, 4, "F");
    doc.setTextColor(30, 41, 59);
    const note = s.note ? ` — ${s.note}` : "";
    doc.text(`Dente ${s.fdi}: ${c.label}${note}`, margin + 6, y);
    y += 5;
    if (y > 270) break;
  }

  if (marked.length === 0) {
    doc.text("Nenhum dente marcado além do padrão.", margin, y);
  }

  doc.save(`odontograma-${input.pacienteId}.pdf`);
}
