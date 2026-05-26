import { useState } from "react";
import { api } from "../api";
import { downloadWithAuth } from "../lib/downloadWithAuth";

export default function RelatoriosPage() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));

  const baixarCsv = () => {
    const url = api.relatorios.producaoCsvUrl(de || undefined, ate || undefined);
    void downloadWithAuth(url, {
      filename: `producao-lab-${new Date().toISOString().slice(0, 10)}.csv`,
    }).catch((e) => alert(e instanceof Error ? e.message : "Erro ao exportar"));
  };

  const abrirHtml = () => {
    const url = api.relatorios.producaoHtmlUrl(de || undefined, ate || undefined);
    void downloadWithAuth(url, { openInNewTab: true }).catch((e) =>
      alert(e instanceof Error ? e.message : "Erro ao abrir relatório"),
    );
  };

  return (
    <>
      <div className="page-header">
        <h2>Relatórios</h2>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <h3 style={{ marginBottom: 12 }}>Produção de próteses</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Data inicial</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data final</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={baixarCsv}>
            Exportar Excel (CSV)
          </button>
          <button type="button" className="btn btn-outline" onClick={abrirHtml}>
            Relatório HTML / PDF
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 12 }}>
          O CSV abre no Excel. O HTML abre em nova aba — use Imprimir → Salvar como PDF.
        </p>
      </div>
    </>
  );
}
