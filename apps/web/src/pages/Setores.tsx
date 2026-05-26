import { useEffect, useState } from "react";
import { api, type Protese } from "../api";
import { StatusBadge } from "../components";
import { SETORES_LAB } from "../lib/setores";

export default function SetoresPage() {
  const [porSetor, setPorSetor] = useState<Record<string, Protese[]>>({});

  const load = async () => {
    const map: Record<string, Protese[]> = {};
    for (const s of SETORES_LAB) {
      map[s.id] = await api.proteses.list(s.id);
    }
    setPorSetor(map);
  };

  useEffect(() => {
    load();
  }, []);

  const mover = async (id: string, setor: string) => {
    await api.proteses.updateSetor(id, setor);
    await load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Status da Produção</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>
          Acompanhe a fila por bancada e mova trabalhos entre setores.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {SETORES_LAB.map((setor) => (
          <div key={setor.id} className="card" style={{ borderTop: `4px solid ${setor.cor}` }}>
            <h3 style={{ marginBottom: 8, fontSize: "1rem" }}>{setor.label}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 12 }}>
              {(porSetor[setor.id] ?? []).length} trabalho(s)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(porSetor[setor.id] ?? []).slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: 8,
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    <code>{p.codigo}</code>
                  </div>
                  <div style={{ fontSize: "0.8rem" }}>{p.paciente.nome}</div>
                  <div style={{ fontSize: "0.75rem", marginTop: 4 }}>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {SETORES_LAB.filter((s) => s.id !== setor.id).map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                        onClick={() => mover(p.id, dest.id)}
                      >
                        → {dest.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {(porSetor[setor.id] ?? []).length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Nenhum trabalho neste setor.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
