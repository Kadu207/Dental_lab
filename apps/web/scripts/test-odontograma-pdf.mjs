/**
 * Smoke test: gera PDF do odontograma em Node (mesma API do browser).
 * Saída: apps/web/tmp/odontograma-smoke-test.pdf
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "tmp");
const outFile = path.join(outDir, "odontograma-smoke-test.pdf");

const CONDITIONS = {
  sadio: { label: "Sadio", color: "#e2e8f0" },
  carie: { label: "Cárie", color: "#dc2626" },
};

const states = [
  { fdi: 11, condition: "carie", note: "Teste smoke" },
  { fdi: 21, condition: "sadio" },
];

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const margin = 14;
let y = margin;

doc.setFillColor(124, 58, 237);
doc.rect(0, 0, 210, 28, "F");
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.text("Odontograma — Dental Lab (smoke test)", margin, 18);
y = 36;

doc.setTextColor(15, 23, 42);
doc.setFontSize(11);
doc.text("Paciente: Paciente Teste", margin, y);
y += 6;
doc.text("ID: smoke-paciente-1", margin, y);
y += 10;

doc.setFontSize(10);
for (const s of states) {
  const c = CONDITIONS[s.condition] ?? CONDITIONS.sadio;
  doc.setFillColor(c.color);
  doc.rect(margin, y - 3, 4, 4, "F");
  doc.setTextColor(30, 41, 59);
  doc.text(`Dente ${s.fdi}: ${c.label}${s.note ? ` — ${s.note}` : ""}`, margin + 6, y);
  y += 5;
}

fs.mkdirSync(outDir, { recursive: true });
const buf = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outFile, buf);

const stat = fs.statSync(outFile);
if (stat.size < 500) {
  console.error("FAIL: PDF muito pequeno (%d bytes)", stat.size);
  process.exit(1);
}

console.log("OK: PDF gerado em", outFile, `(${stat.size} bytes)`);
console.log("jsPDF version:", typeof doc.internal?.getVersion === "function" ? doc.internal.getVersion() : "4.x");
