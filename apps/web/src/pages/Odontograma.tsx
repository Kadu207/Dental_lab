import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Cliente } from "../api";
import { ActionButton } from "../components/ui/ActionButton";
import { PageHeader } from "../components/ui/PageHeader";
import { PermissionGate } from "../components/PermissionGate";
import { usePermissions } from "../hooks/usePermissions";
import { normalizeList } from "../lib/pagination";
import {
  CONDITIONS,
  CONDITION_MAP,
  LOWER_FDI,
  UPPER_FDI,
  mapToStates,
  statesToMap,
  toothName,
  type ToothConditionId,
  type ToothState,
  type ToothStateMap,
} from "../lib/odontograma";
import {
  formatVersionDate,
  getHistory,
  pushVersion,
  type OdontogramaVersion,
} from "../lib/odontogramaHistory";
import { exportOdontogramaPdf } from "../lib/odontogramaPdf";

const DentalArch3D = lazy(() =>
  import("../components/odontograma/DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

const RESOURCE = "odontograma";
type ViewMode = "3d" | "list" | "history";

function OdontogramaPage() {
  const { can } = usePermissions();
  const canWrite = can(RESOURCE, "write");

  const [mounted, setMounted] = useState(false);
  const [pacientes, setPacientes] = useState<Cliente[]>([]);
  const [pacientesErro, setPacientesErro] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [activeCondition, setActiveCondition] = useState<ToothConditionId>("carie");
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [stateMap, setStateMap] = useState<ToothStateMap>({});
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<ViewMode>("3d");
  const [history, setHistory] = useState<OdontogramaVersion[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    api.pacientes
      .list({ limit: 200 })
      .then((data) => {
        const page = normalizeList<Cliente>(data, { limit: 200 });
        setPacientes(page.items);
      })
      .catch((e) => setPacientesErro(e instanceof Error ? e.message : "Lista indisponível"));
  }, []);

  const pacienteNome = useMemo(
    () => pacientes.find((p) => String(p.id) === pacienteId)?.nome ?? "",
    [pacientes, pacienteId],
  );

  const loadOdontograma = useCallback(async (id: string) => {
    if (!id) return;
    setCarregando(true);
    setErro("");
    try {
      const data = await api.odontograma.get(id);
      setStateMap(statesToMap(data.dentes as ToothState[]));
      setUpdatedAt(data.updatedAt);
      setDirty(false);
      setSelectedTooth(null);
    } catch {
      setStateMap({});
      setUpdatedAt(null);
      setDirty(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (pacienteId) void loadOdontograma(pacienteId);
    setHistory(pacienteId ? getHistory(pacienteId) : []);
  }, [pacienteId, loadOdontograma]);

  const applyTooth = (fdi: number) => {
    setSelectedTooth(fdi);
    if (!canWrite) return;
    setStateMap((prev) => {
      const current = prev[fdi]?.condition;
      const next: ToothConditionId = current === activeCondition ? "sadio" : activeCondition;
      return { ...prev, [fdi]: { fdi, condition: next, note: prev[fdi]?.note ?? null } };
    });
    setDirty(true);
  };

  const setToothCondition = (fdi: number, cond: ToothConditionId) => {
    if (!canWrite) return;
    setStateMap((prev) => ({
      ...prev,
      [fdi]: { fdi, condition: cond, note: prev[fdi]?.note ?? null },
    }));
    setDirty(true);
  };

  const setToothNote = (fdi: number, note: string) => {
    if (!canWrite) return;
    setStateMap((prev) => ({
      ...prev,
      [fdi]: { fdi, condition: prev[fdi]?.condition ?? "sadio", note },
    }));
    setDirty(true);
  };

  const salvar = async () => {
    if (!pacienteId || !canWrite) return;
    setSalvando(true);
    setErro("");
    setMsg("");
    try {
      const dentes = mapToStates(stateMap);
      const res = await api.odontograma.save(
        pacienteId,
        dentes.map((d) => ({ fdi: d.fdi, condition: d.condition, note: d.note ?? undefined })),
      );
      setUpdatedAt(res.updatedAt);
      pushVersion(pacienteId, mapToStates(stateMap));
      setHistory(getHistory(pacienteId));
      setDirty(false);
      setMsg("Odontograma salvo.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const handleExportPdf = () => {
    if (!pacienteId) {
      setErro("Selecione um paciente primeiro.");
      return;
    }
    let imageDataUrl: string | null = null;
    try {
      imageDataUrl = canvasRef.current?.toDataURL("image/png") ?? null;
    } catch {
      imageDataUrl = null;
    }
    exportOdontogramaPdf({
      pacienteNome,
      pacienteId,
      imageDataUrl,
      states: mapToStates(stateMap),
      savedAt: updatedAt,
    });
    setMsg("PDF gerado.");
  };

  const restoreVersion = (v: OdontogramaVersion) => {
    setStateMap(statesToMap(v.dentes));
    setDirty(true);
    setSelectedTooth(null);
    setView("3d");
    setMsg(`Versão de ${formatVersionDate(v.savedAt)} restaurada. Salve para confirmar.`);
  };

  const marked = mapToStates(stateMap);
  const selectedState = selectedTooth != null ? stateMap[selectedTooth] : null;

  return (
    <div className="odontograma-page">
      <PageHeader
        title="Odontograma 3D"
        subtitle="Arcada interativa em 3D. Selecione um paciente, escolha uma condição e clique nos dentes para marcar."
        actions={
          <>
            <ActionButton variant="outline" disabled={!pacienteId} onClick={handleExportPdf}>
              Exportar PDF
            </ActionButton>
            {canWrite ? (
              <ActionButton
                variant="purple"
                disabled={!pacienteId || !dirty || salvando}
                onClick={salvar}
              >
                {salvando ? "Salvando…" : "Salvar odontograma"}
              </ActionButton>
            ) : null}
          </>
        }
      />

      {erro ? <div className="alert alert-error">{erro}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card odontograma-patient-card">
        <label className="form-label">
          Paciente
          {pacientes.length > 0 ? (
            <select
              className="form-input"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Selecione um paciente…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="form-input"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value.replace(/\D/g, ""))}
              placeholder={pacientesErro || "ID do paciente"}
            />
          )}
        </label>
        {updatedAt ? (
          <p className="odontograma-meta">Última gravação: {formatVersionDate(updatedAt)}</p>
        ) : null}
      </div>

      <div className="odontograma-tabs card">
        {(["3d", "list", "history"] as ViewMode[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`odontograma-tab${view === id ? " active" : ""}`}
            onClick={() => setView(id)}
          >
            {id === "3d" ? "Arcada 3D" : id === "list" ? "Lista de dentes" : `Histórico${history.length ? ` (${history.length})` : ""}`}
          </button>
        ))}
      </div>

      {view === "3d" && (
        <div className="odontograma-grid">
          <div className="odontograma-viewport card">
            {mounted ? (
              <Suspense fallback={<p className="odontograma-loading">Carregando cena 3D…</p>}>
                <DentalArch3D
                  states={stateMap}
                  selected={selectedTooth}
                  onSelect={applyTooth}
                  onCanvasReady={(c) => (canvasRef.current = c)}
                />
              </Suspense>
            ) : (
              <p className="odontograma-loading">Carregando cena 3D…</p>
            )}
            {carregando && pacienteId ? (
              <span className="odontograma-badge">Carregando dentes…</span>
            ) : null}
            <span className="odontograma-hint">Arraste para girar · scroll para zoom</span>
          </div>

          <aside className="odontograma-side">
            <div className="card">
              <h3 className="odontograma-panel-title">Condições</h3>
              <div className="odontograma-conditions">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!canWrite}
                    className={`odontograma-cond-btn${activeCondition === c.id ? " active" : ""}`}
                    onClick={() => setActiveCondition(c.id)}
                  >
                    <span className="odontograma-swatch" style={{ backgroundColor: c.color }} />
                    {c.label}
                  </button>
                ))}
              </div>
              {canWrite ? (
                <p className="odontograma-hint-text">
                  Pincel: <strong>{CONDITION_MAP[activeCondition].label}</strong>. Clique no dente para
                  aplicar (de novo volta a saudável).
                </p>
              ) : null}
            </div>

            <div className="card">
              <h3 className="odontograma-panel-title">Dente selecionado</h3>
              {selectedTooth == null ? (
                <p className="odontograma-hint-text">Clique num dente da arcada.</p>
              ) : (
                <>
                  <p className="odontograma-tooth-title">
                    {toothName(selectedTooth)} · {selectedTooth}
                  </p>
                  <label className="form-label">
                    Condição
                    <select
                      className="form-input"
                      disabled={!canWrite}
                      value={selectedState?.condition ?? "sadio"}
                      onChange={(e) =>
                        setToothCondition(selectedTooth, e.target.value as ToothConditionId)
                      }
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label">
                    Observação
                    <textarea
                      className="form-input"
                      rows={3}
                      disabled={!canWrite}
                      value={selectedState?.note ?? ""}
                      onChange={(e) => setToothNote(selectedTooth, e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="card">
              <h3 className="odontograma-panel-title">Resumo ({marked.length})</h3>
              {marked.length === 0 ? (
                <p className="odontograma-hint-text">Nenhuma marcação.</p>
              ) : (
                <ul className="odontograma-summary">
                  {marked.map((s) => (
                    <li key={s.fdi}>
                      <span
                        className="odontograma-swatch"
                        style={{ backgroundColor: CONDITION_MAP[s.condition].color }}
                      />
                      <strong>{s.fdi}</strong> {CONDITION_MAP[s.condition].label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      {view === "list" && (
        <ToothListEditor stateMap={stateMap} canWrite={canWrite} onCondition={setToothCondition} onNote={setToothNote} />
      )}

      {view === "history" && (
        <div className="card">
          <h3 className="odontograma-panel-title">Histórico de versões</h3>
          {!pacienteId ? (
            <p className="odontograma-hint-text">Selecione um paciente.</p>
          ) : history.length === 0 ? (
            <p className="odontograma-hint-text">Nenhuma versão local. Salve para registrar.</p>
          ) : (
            <ul className="odontograma-history">
              {history.map((v, i) => (
                <li key={v.id}>
                  <div>
                    <strong>{formatVersionDate(v.savedAt)}</strong>
                    {i === 0 ? <span className="odontograma-tag">Atual</span> : null}
                    <p className="odontograma-hint-text">{v.count} dente(s) marcado(s)</p>
                  </div>
                  {canWrite ? (
                    <ActionButton variant="outline" onClick={() => restoreVersion(v)}>
                      Restaurar
                    </ActionButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ToothListEditor({
  stateMap,
  canWrite,
  onCondition,
  onNote,
}: {
  stateMap: ToothStateMap;
  canWrite: boolean;
  onCondition: (fdi: number, cond: ToothConditionId) => void;
  onNote: (fdi: number, note: string) => void;
}) {
  const rows = (fdis: number[], title: string) => (
    <div className="card">
      <h3 className="odontograma-panel-title">{title}</h3>
      <div className="odontograma-list-rows">
        {fdis.map((fdi) => {
          const st = stateMap[fdi];
          const cond = st?.condition ?? "sadio";
          return (
            <div key={fdi} className="odontograma-list-row">
              <span className="odontograma-list-fdi" style={{ backgroundColor: CONDITION_MAP[cond].color }}>
                {fdi}
              </span>
              <span className="odontograma-hint-text">{toothName(fdi)}</span>
              <select
                className="form-input"
                disabled={!canWrite}
                value={cond}
                onChange={(e) => onCondition(fdi, e.target.value as ToothConditionId)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                disabled={!canWrite}
                value={st?.note ?? ""}
                onChange={(e) => onNote(fdi, e.target.value)}
                placeholder="Observação…"
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="odontograma-list-grid">
      {rows(UPPER_FDI, "Arcada superior")}
      {rows(LOWER_FDI, "Arcada inferior")}
    </div>
  );
}

export default function OdontogramaRoute() {
  return (
    <PermissionGate resource={RESOURCE}>
      <OdontogramaPage />
    </PermissionGate>
  );
}
