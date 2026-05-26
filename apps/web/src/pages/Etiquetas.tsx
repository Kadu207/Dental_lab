import { useEffect, useMemo, useState } from "react";
import { api, STATUS_LABELS, type Historico, type LabConfig, type Protese } from "../api";
import { Modal, StatusBadge } from "../components";
import { downloadWithAuth } from "../lib/downloadWithAuth";
import { resolveTamanho, type TamanhoEtiqueta } from "../lib/labelSizes";

type TabId = "a_executar" | "em_execucao" | "finalizados";

const TABS: { id: TabId; label: string; statuses: string[] }[] = [
  { id: "a_executar", label: "A executar", statuses: ["recebido"] },
  { id: "em_execucao", label: "Em execução", statuses: ["em_producao", "prova", "acabamento"] },
  { id: "finalizados", label: "Finalizados", statuses: ["pronto", "entregue"] },
];

export default function EtiquetasPage() {
  const [proteses, setProteses] = useState<Protese[]>([]);
  const [tab, setTab] = useState<TabId>("a_executar");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detalhe, setDetalhe] = useState<{ protese: Protese; historico: Historico[] } | null>(null);
  const [tamanho, setTamanho] = useState<TamanhoEtiqueta>("termica_100x50");
  const [erro, setErro] = useState("");
  const [imprimindo, setImprimindo] = useState(false);

  const load = async () => {
    try {
      const list = await api.proteses.list();
      setProteses(list);
      const cfg = await api.config.getLab();
      setTamanho(resolveTamanho(cfg));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tabConfig = TABS.find((t) => t.id === tab)!;
  const filtradas = useMemo(
    () => proteses.filter((p) => tabConfig.statuses.includes(p.status)),
    [proteses, tabConfig.statuses],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodosTab = () => {
    setSelected(new Set(filtradas.map((p) => p.id)));
  };

  const limparSelecao = () => setSelected(new Set());

  const abrirDetalhe = async (id: string) => {
    try {
      const data = await api.proteses.get(id);
      setDetalhe(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao abrir trabalho");
    }
  };

  const imprimirSelecionados = async () => {
    if (selected.size === 0) {
      alert("Selecione ao menos um trabalho para imprimir.");
      return;
    }
    setImprimindo(true);
    setErro("");
    try {
      for (const id of selected) {
        await downloadWithAuth(api.proteses.imprimirUrl(id, tamanho), { openInNewTab: true });
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao imprimir");
    } finally {
      setImprimindo(false);
    }
  };

  const imprimirUm = async (id: string) => {
    try {
      await downloadWithAuth(api.proteses.imprimirUrl(id, tamanho), { openInNewTab: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao imprimir");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Etiquetas</h2>
          <p className="page-desc" style={{ margin: "4px 0 0" }}>
            Selecione trabalhos por fase, abra detalhes e imprima as etiquetas 3 vias.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={selecionarTodosTab}>
            Selecionar todos ({filtradas.length})
          </button>
          <button type="button" className="btn btn-outline" onClick={limparSelecao} disabled={selected.size === 0}>
            Limpar seleção
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={imprimirSelecionados}
            disabled={selected.size === 0 || imprimindo}
          >
            {imprimindo ? "Imprimindo…" : `Imprimir selecionados (${selected.size})`}
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              setTab(t.id);
              limparSelecao();
            }}
          >
            {t.label} ({proteses.filter((p) => t.statuses.includes(p.status)).length})
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Código</th>
              <th>Paciente</th>
              <th>Trabalho</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => (
              <tr
                key={p.id}
                style={{ cursor: "pointer" }}
                onClick={() => abrirDetalhe(p.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Selecionar ${p.codigo}`}
                  />
                </td>
                <td>
                  <code>{p.codigo}</code>
                </td>
                <td>{p.paciente.nome}</td>
                <td>{p.tipoProtese}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn btn-outline" onClick={() => abrirDetalhe(p.id)}>
                    Abrir
                  </button>
                  <button type="button" className="btn btn-accent" onClick={() => imprimirUm(p.id)}>
                    Imprimir
                  </button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>
                  Nenhum trabalho nesta fase.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detalhe && (
        <Modal title={`Trabalho ${detalhe.protese.codigo}`} onClose={() => setDetalhe(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.9rem" }}>
            <p>
              <strong>Paciente:</strong> {detalhe.protese.paciente.nome}
            </p>
            <p>
              <strong>Telefone:</strong> {detalhe.protese.paciente.telefone ?? "—"}
            </p>
            <p>
              <strong>Trabalho:</strong> {detalhe.protese.tipoProtese}
            </p>
            <p>
              <strong>Dentista:</strong> {detalhe.protese.dentista.nome}
            </p>
            <p>
              <strong>Status:</strong> {STATUS_LABELS[detalhe.protese.status] ?? detalhe.protese.status}
            </p>
            <p>
              <strong>Entrada:</strong> {detalhe.protese.dataEntrada}
            </p>
            {detalhe.protese.observacoes && (
              <p>
                <strong>Obs.:</strong> {detalhe.protese.observacoes}
              </p>
            )}
            {detalhe.historico.length > 0 && (
              <div>
                <strong>Histórico</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {detalhe.historico.map((h) => (
                    <li key={h.id}>
                      {STATUS_LABELS[h.status] ?? h.status} — {h.createdAt.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setDetalhe(null)}>
              Fechar
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => imprimirUm(detalhe.protese.id)}
            >
              Imprimir etiquetas
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
