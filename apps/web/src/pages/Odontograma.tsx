import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { api, type Cliente } from "../api";
import { PermissionGate } from "../components/PermissionGate";
import {
  CONDITIONS,
  CONDITION_MAP,
  mergeToothStates,
  type ToothConditionId,
  type ToothState,
} from "../lib/odontograma";
import { clearHistory, formatVersionDate, getHistory, pushVersion, type OdontogramaVersion } from "../lib/odontogramaHistory";
import { exportOdontogramaPdf } from "../lib/odontogramaPdf";
import { useSession } from "../lib/SessionContext";
import { canAccess } from "../lib/permissions";

const DentalArch3D = lazy(() =>
  import("../components/odontograma/DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

export default function OdontogramaPage() {
  const { permissoes } = useSession();
  const canWrite = canAccess(permissoes, "odontograma", "write");

  const [pacientes, setPacientes] = useState<Cliente[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [states, setStates] = useState<ToothState[]>(mergeToothStates([]));
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<OdontogramaVersion[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const paciente = useMemo(() => pacientes.find((p) => p.id === pacienteId), [pacientes, pacienteId]);

  useEffect(() => {
    api.clientes
      .list()
      .then(setPacientes)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar pacientes"));
  }, []);

  const loadOdontograma = useCallback(async (id: string) => {
    if (!id) return;
    setCarregando(true);
    setErro("");
    try {
      const data = await api.odontograma.get(id);
      setStates(mergeToothStates(data.dentes as ToothState[]));
      setUpdatedAt(data.updatedAt);
      setHistory(getHistory(id));
      setSelectedFdi(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar odontograma");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (pacienteId) void loadOdontograma(pacienteId);
  }, [pacienteId, loadOdontograma]);

  const setCondition = (fdi: number, condition: ToothConditionId) => {
    if (!canWrite) return;
    setStates((prev) => prev.map((s) => (s.fdi === fdi ? { ...s, condition } : s)));
  };

  const setNote = (fdi: number, note: string) => {
    if (!canWrite) return;
    setStates((prev) => prev.map((s) => (s.fdi === fdi ? { ...s, note } : s)));
  };

  const salvar = async () => {
    if (!pacienteId || !canWrite) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await api.odontograma.save(pacienteId, states);
      setUpdatedAt(res.updatedAt);
      setHistory(pushVersion(pacienteId, states));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const restaurarVersao = (v: OdontogramaVersion) => {
    if (!canWrite) return;
    setStates(mergeToothStates(v.dentes));
  };

  const exportarPdf = () => {
    if (!paciente) return;
    exportOdontogramaPdf({
      pacienteNome: paciente.nome,
      pacienteId: paciente.id,
      states,
      savedAt: updatedAt ?? undefined,
    });
  };

  const selected = selectedFdi != null ? states.find((s) => s.fdi === selectedFdi) : null;

  return (
    <PermissionGate resource="odontograma" fallback={<p className="alert alert-error">Sem permissão para odontograma.</p>}>
      <div className="page-header">
        <h2>Odontograma</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={exportarPdf} disabled={!pacienteId}>
            Exportar PDF
          </button>
          {canWrite ? (
            <button type="button" className="btn btn-primary" onClick={salvar} disabled={!pacienteId || salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          ) : null}
        </div>
      </div>

      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Paciente
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            style={{ display: "block", width: "100%", maxWidth: 480, marginTop: 6 }}
          >
            <option value="">Selecione um paciente…</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        {updatedAt ? (
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            Última gravação no servidor: {formatVersionDate(updatedAt)}
          </p>
        ) : null}
      </div>

      {!pacienteId ? (
        <p style={{ color: "var(--muted)" }}>Escolha um paciente para visualizar ou editar o odontograma.</p>
      ) : carregando ? (
        <p style={{ color: "var(--muted)" }}>Carregando odontograma…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
          <div className="card">
            <Suspense fallback={<p>Carregando visualização 3D…</p>}>
              <DentalArch3D states={states} selectedFdi={selectedFdi} onSelect={setSelectedFdi} />
            </Suspense>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 8 }}>
              Clique em um dente para selecionar. Arraste para girar a arcada.
            </p>
          </div>

          <aside className="card">
            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Dente {selectedFdi ?? "—"}</h3>
            {selected ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={selected.condition === c.id ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "0.75rem", borderColor: c.color }}
                      disabled={!canWrite}
                      onClick={() => setCondition(selected.fdi, c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <label style={{ display: "block", fontSize: "0.875rem" }}>
                  Observação
                  <textarea
                    value={selected.note ?? ""}
                    disabled={!canWrite}
                    onChange={(e) => setNote(selected.fdi, e.target.value)}
                    rows={3}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
                <p style={{ fontSize: "0.8rem", color: CONDITION_MAP[selected.condition]?.color }}>
                  {CONDITION_MAP[selected.condition]?.label}
                </p>
              </>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Selecione um dente na arcada.</p>
            )}

            <h4 style={{ marginTop: 20, fontSize: "0.9rem" }}>Histórico local</h4>
            {history.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Salve para criar versões no navegador.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.8rem" }}>
                {history.slice(0, 8).map((v) => (
                  <li key={v.id} style={{ marginBottom: 8 }}>
                    <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={() => restaurarVersao(v)}>
                      {formatVersionDate(v.savedAt)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && canWrite ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8, width: "100%" }}
                onClick={() => {
                  clearHistory(pacienteId);
                  setHistory([]);
                }}
              >
                Limpar histórico local
              </button>
            ) : null}
          </aside>
        </div>
      )}
    </PermissionGate>
  );
}
