/**
 * Smoke test: gera PDF do odontograma em Node (mesma API do browser).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "tmp");
const outFile = path.join(outDir, "odontograma-smoke-test.pdf");

const states = [
  { fdi: 11, condition: "carie", note: "Teste smoke" },
  { fdi: 21, condition: "sadio", note: null },
];

const doc = new jsPDF({ unit: "pt", format: "a4" });
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("Odontograma smoke test", 40, 50);
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
let y = 70;
for (const s of states) {
  doc.text(`Dente ${s.fdi}: ${s.condition}`, 40, y);
  y += 14;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, Buffer.from(doc.output("arraybuffer")));

const stat = fs.statSync(outFile);
if (stat.size < 500) {
  console.error("FAIL: PDF muito pequeno (%d bytes)", stat.size);
  process.exit(1);
}
console.log("OK: PDF gerado em", outFile, `(${stat.size} bytes)`);
