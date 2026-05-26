import { useEffect, useRef, useState } from "react";
import { api, type LabConfig, type ScanResult } from "../api";
import { StatusBadge } from "../components";
import { resolveTamanho, type TamanhoEtiqueta } from "../lib/labelSizes";
import { downloadWithAuth } from "../lib/downloadWithAuth";

export default function ScannerPage() {
  const [codigo, setCodigo] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [tamanho, setTamanho] = useState<TamanhoEtiqueta>("termica_100x50");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    api.config.getLab().then((cfg: LabConfig) => setTamanho(resolveTamanho(cfg)));
  }, []);

  const scan = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setErro("");
    try {
      const res = await api.scanner.scan(trimmed);
      setResult(res);
      setCodigo("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Código não encontrado");
      setResult(null);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const avancarStatus = async () => {
    if (!result?.protese.proximoStatus) return;
    await api.proteses.updateStatus(
      result.protese.id,
      result.protese.proximoStatus,
      `Avançado via leitor de código de barras`
    );
    await scan(result.protese.codigo);
  };

  return (
    <>
      <div className="page-header">
        <h2>Leitor de Código de Barras</h2>
      </div>

      <div className="card scanner-box">
        <p style={{ marginBottom: 16, color: "#64748b" }}>
          Aponte o leitor USB ou digite o código. O leitor envia Enter automaticamente.
        </p>
        <input
          ref={inputRef}
          className="scanner-input"
          placeholder="PROT-20260519-0001"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") scan(codigo);
          }}
          disabled={loading}
          autoFocus
        />
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => scan(codigo)} disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      {result && (
        <div className="card scanner-result">
          <h3>{result.protese.codigo}</h3>
          <p><strong>Paciente:</strong> {result.protese.paciente}</p>
          <p><strong>Dentista:</strong> {result.protese.dentista}</p>
          <p><strong>Trabalho:</strong> {result.protese.tipoProtese}</p>
          <p>
            <strong>Status:</strong>{" "}
            <StatusBadge status={result.protese.status} />
          </p>

          {result.protese.proximoStatus && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-accent" onClick={avancarStatus}>
                Avançar para: {result.protese.proximoStatusLabel}
              </button>
            </div>
          )}

          <div className="timeline">
            <h4 style={{ marginBottom: 8 }}>Histórico</h4>
            {result.historico.map((h, i) => (
              <div key={i} className="timeline-item">
                <strong>{h.statusLabel}</strong>
                <span style={{ color: "#64748b", marginLeft: 8, fontSize: "0.8rem" }}>
                  {new Date(h.createdAt).toLocaleString("pt-BR")}
                </span>
                {h.observacao && <div style={{ fontSize: "0.85rem" }}>{h.observacao}</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-outline"
              onClick={() =>
                void downloadWithAuth(api.proteses.imprimirUrl(result.protese.id, tamanho), {
                  openInNewTab: true,
                }).catch((e) => setErro(e instanceof Error ? e.message : "Erro ao imprimir"))
              }
            >
              🖨️ Reimprimir 3 vias
            </button>
          </div>
        </div>
      )}
    </>
  );
}
