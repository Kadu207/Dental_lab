import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, STATUS_LABELS, type DashboardKpis, type Protese } from "../api";
import { StatusBadge } from "../components";
import { KpiBarChart, SetorDonutChart, StatusBarChart, type ChartDatum } from "../components/DashboardCharts";
import { Tooltip } from "../components/Tooltip";
import { SETORES_LAB } from "../lib/setores";

const STATUS_COLORS: Record<string, string> = {
  recebido: "#3b82f6",
  em_producao: "#f59e0b",
  prova: "#8b5cf6",
  acabamento: "#ec4899",
  pronto: "#10b981",
  entregue: "#64748b",
};

const KPI_META = [
  {
    key: "total" as const,
    label: "Total de trabalhos",
    tip: "Quantidade total de próteses cadastradas no laboratório.",
    color: "#1e3a5f",
  },
  {
    key: "hojeEntrada" as const,
    label: "Entradas hoje",
    tip: "Trabalhos recebidos ou registrados na data de hoje.",
    color: "#2d6a4f",
  },
  {
    key: "prontos" as const,
    label: "Prontos p/ entrega",
    tip: "Trabalhos com status Pronto, aguardando retirada pela clínica.",
    color: "#10b981",
  },
  {
    key: "atrasados" as const,
    label: "Atrasados",
    tip: "Trabalhos com previsão de entrega vencida e ainda não entregues.",
    color: "#c1121f",
  },
];

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [proteses, setProteses] = useState<Protese[]>([]);

  useEffect(() => {
    api.dashboard.kpis().then(setKpis).catch(() => setKpis(null));
    api.proteses.list().then(setProteses);
  }, []);

  const statusChartData = useMemo<ChartDatum[]>(() => {
    if (!kpis) return [];
    return Object.entries(kpis.porStatus)
      .filter(([, n]) => n > 0)
      .map(([status, value]) => ({
        label: STATUS_LABELS[status] ?? status,
        value,
        color: STATUS_COLORS[status] ?? "#64748b",
      }));
  }, [kpis]);

  const setorChartData = useMemo<ChartDatum[]>(() => {
    if (!kpis) return [];
    return SETORES_LAB.map((s) => ({
      label: s.label,
      value: kpis.porSetor[s.id] ?? 0,
      color: s.cor,
    })).filter((d) => d.value > 0);
  }, [kpis]);

  const kpiChartData = useMemo<ChartDatum[]>(() => {
    if (!kpis) return [];
    return KPI_META.map((m) => ({
      label: m.label,
      value: kpis[m.key],
      color: m.color,
      tooltip: m.tip,
    }));
  }, [kpis]);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/setores" className="btn btn-outline">
            Status da Produção
          </Link>
          <Link to="/relatorios" className="btn btn-outline">
            Relatórios
          </Link>
        </div>
      </div>

      {kpis && kpis.estoqueAlertas > 0 ? (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⚠️ {kpis.estoqueAlertas} item(ns) de estoque abaixo do mínimo.{" "}
          <Link to="/estoque">Ver estoque →</Link>
        </div>
      ) : null}

      {kpis && kpis.atrasados > 0 ? (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⏱ {kpis.atrasados} trabalho(s) com previsão de entrega vencida.{" "}
          <Link to="/proteses">Ver próteses →</Link>
        </div>
      ) : null}

      <div className="stats">
        {KPI_META.map((m) => (
          <Tooltip key={m.key} content={m.tip}>
            <div className="stat-card stat-card-tip">
              <div className="num" style={{ color: m.key === "atrasados" && kpis && kpis.atrasados > 0 ? m.color : m.key === "atrasados" ? undefined : m.color }}>
                {kpis?.[m.key] ?? "—"}
              </div>
              <div className="lbl">{m.label}</div>
            </div>
          </Tooltip>
        ))}
      </div>

      {kpis ? (
        <div className="chart-grid">
          <KpiBarChart data={kpiChartData} title="Visão geral dos indicadores" />
          <SetorDonutChart data={setorChartData} title="Distribuição por setor" />
          <StatusBarChart data={statusChartData} title="Produção por status" />
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--muted)" }}>Carregando indicadores…</p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Trabalhos recentes</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Paciente</th>
              <th>Trabalho</th>
              <th>Setor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {proteses.slice(0, 8).map((p) => (
              <tr key={p.id}>
                <td>
                  <Tooltip content={`Código interno: ${p.codigo}`}>
                    <code>{p.codigo}</code>
                  </Tooltip>
                </td>
                <td>{p.paciente.nome}</td>
                <td>{p.tipoProtese}</td>
                <td>{p.setor ?? "gesso"}</td>
                <td>
                  <Tooltip content={STATUS_LABELS[p.status] ?? p.status}>
                    <span>
                      <StatusBadge status={p.status} />
                    </span>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Link to="/proteses">Ver todos →</Link>
        </div>
      </div>
    </>
  );
}
