import { useEffect, useState } from "react";
import { api, type CampoEtiqueta, type LabConfig } from "../api";
import { TAMANHOS_ETIQUETA, type TamanhoEtiqueta, saveTamanhoLocal } from "../lib/labelSizes";
import { downloadWithAuth } from "../lib/downloadWithAuth";

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<LabConfig>({ nome: "" });
  const [campos, setCampos] = useState<CampoEtiqueta[]>([]);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.config.getLab().then(setConfig);
    api.etiquetas.campos().then(setCampos);
  }, []);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setErro("Use PNG ou JPG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErro("Logo máximo 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setConfig({ ...config, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
    setErro("");
  };

  const salvar = async () => {
    try {
      const payload: LabConfig = {
        ...config,
        tamanhoEtiquetaPadrao: (config.tamanhoEtiquetaPadrao ?? "termica_100x50") as TamanhoEtiqueta,
      };
      await api.config.saveLab(payload);
      if (payload.tamanhoEtiquetaPadrao) saveTamanhoLocal(payload.tamanhoEtiquetaPadrao);
      setMsg("Configuração salva! Será usada em todas as etiquetas.");
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const testarImpressao = () => {
    const t = (config.tamanhoEtiquetaPadrao ?? "termica_100x50") as TamanhoEtiqueta;
    void downloadWithAuth(api.etiquetas.testeImpressaoUrl(t), { openInNewTab: true }).catch((e) =>
      setErro(e instanceof Error ? e.message : "Erro ao imprimir teste"),
    );
  };

  const removerLogo = () => setConfig({ ...config, logoUrl: "" });

  const iniciais = config.nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <div className="page-header">
        <h2>Configuração — Etiquetas</h2>
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 style={{ marginBottom: 16 }}>Empresa / Laboratório</h3>
        <div className="form-grid">
          <div className="form-group full">
            <label>Nome da empresa *</label>
            <input
              value={config.nome}
              onChange={(e) => setConfig({ ...config, nome: e.target.value })}
              placeholder="Laboratório Dental Exemplo"
            />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input
              value={config.telefone ?? ""}
              onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Endereço</label>
            <input
              value={config.endereco ?? ""}
              onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
            />
          </div>
          <div className="form-group full">
            <label>Logo da empresa (PNG/JPG)</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={onLogo} />
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Se não houver logo, exibe as iniciais do nome
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" style={{ width: 56, height: 56, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4 }} />
          ) : (
            <div style={{ width: 56, height: 56, background: "#1e3a5f", color: "#fff", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
              {iniciais || "LD"}
            </div>
          )}
          {config.logoUrl && (
            <button type="button" className="btn btn-outline" onClick={removerLogo}>Remover logo</button>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Impressão de etiquetas</h3>
        <div className="form-group full">
          <label>Tamanho padrão da bobina</label>
          <select
            value={config.tamanhoEtiquetaPadrao ?? "termica_100x50"}
            onChange={(e) =>
              setConfig({ ...config, tamanhoEtiquetaPadrao: e.target.value as TamanhoEtiqueta })
            }
          >
            {TAMANHOS_ETIQUETA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {t.hint ? ` — ${t.hint}` : ""}
              </option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>
          Recomendado: <strong>100×50 mm</strong> na Zebra ZD230 (ver IMPRESSORA-ETIQUETAS.md). Use o teste
          abaixo antes da validação física na impressora real.
        </p>
        <button type="button" className="btn btn-accent" onClick={testarImpressao}>
          🖨️ Imprimir etiqueta de teste (3 vias)
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Campos da etiqueta</h3>
        <table>
          <thead>
            <tr><th>Campo na etiqueta</th><th>Origem no sistema</th><th>Observação</th></tr>
          </thead>
          <tbody>
            {campos.map((c) => (
              <tr key={c.campo}>
                <td><strong>{c.campo}</strong></td>
                <td><code>{c.origem}</code></td>
                <td style={{ color: "#64748b" }}>
                  {c.tipo ? `${c.tipo} — ` : ""}
                  {c.fallback ? `Fallback: ${c.fallback}` : "Obrigatório"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
