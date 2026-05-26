import { useMemo, useState } from "react";
import { Tooltip } from "./Tooltip";

export type ChartDatum = {
  label: string;
  value: number;
  color: string;
  tooltip?: string;
};

type HoverInfo = {
  label: string;
  value: number;
  pct: number;
  x: number;
  y: number;
};

function formatPct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function KpiBarChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);
  const width = 480;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 48, left: 16 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const barW = chartW / Math.max(data.length, 1) - 12;

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" aria-label={title}>
          {data.map((d, i) => {
            const barH = (d.value / max) * chartH;
            const x = pad.left + i * (chartW / data.length) + 6;
            const y = pad.top + chartH - barH;
            const pct = formatPct(d.value, total);
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={d.color}
                  className="chart-bar"
                  onMouseEnter={(e) =>
                    setHover({
                      label: d.label,
                      value: d.value,
                      pct,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseMove={(e) =>
                    setHover((h) =>
                      h
                        ? { ...h, x: e.clientX, y: e.clientY }
                        : { label: d.label, value: d.value, pct, x: e.clientX, y: e.clientY },
                    )
                  }
                  onMouseLeave={() => setHover(null)}
                />
                <text x={x + barW / 2} y={height - 18} textAnchor="middle" className="chart-label">
                  {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
                </text>
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-value">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
        {hover ? (
          <div className="chart-tooltip-floating" style={{ left: hover.x, top: hover.y }}>
            <strong>{hover.label}</strong>
            <span>{hover.value} trabalho(s)</span>
            <span>{hover.pct}% do total exibido</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatusBarChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-bars-h">
        {data.map((d) => {
          const pct = formatPct(d.value, total);
          const widthPct = Math.round((d.value / max) * 100);
          return (
            <Tooltip
              key={d.label}
              content={
                <>
                  <strong>{d.label}</strong>
                  <br />
                  {d.value} trabalho(s) · {pct}% da produção
                </>
              }
            >
              <div
                className="chart-bar-row"
                onMouseEnter={(e) =>
                  setHover({ label: d.label, value: d.value, pct, x: e.clientX, y: e.clientY })
                }
                onMouseMove={(e) =>
                  setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : null))
                }
                onMouseLeave={() => setHover(null)}
              >
                <span className="chart-bar-row-label">{d.label}</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${widthPct}%`, background: d.color }} />
                </div>
                <strong className="chart-bar-row-value">{d.value}</strong>
              </div>
            </Tooltip>
          );
        })}
      </div>
      {hover ? (
        <div className="chart-tooltip-floating" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.label}</strong>
          <span>{hover.value} · {hover.pct}%</span>
        </div>
      ) : null}
    </div>
  );
}

export function SetorDonutChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const [hover, setHover] = useState<ChartDatum | null>(null);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const stroke = 28;

  const slices = useMemo(() => {
    let angle = -Math.PI / 2;
    return data.map((d) => {
      const slice = total > 0 ? (d.value / total) * Math.PI * 2 : 0;
      const start = angle;
      angle += slice;
      const end = angle;
      const large = slice > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const path =
        slice <= 0
          ? ""
          : slice >= Math.PI * 2 - 0.001
            ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
            : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
      return { ...d, path, pct: formatPct(d.value, total) };
    });
  }, [data, total, cx, cy, r]);

  const centerLabel = hover ? hover.label : "Total";
  const centerValue = hover ? hover.value : total;

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-donut-layout">
        <svg viewBox={`0 0 ${size} ${size}`} className="chart-donut" aria-label={title}>
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          ) : (
            slices.map((s) =>
              s.path ? (
                <path
                  key={s.label}
                  d={s.path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  className="chart-slice"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                />
              ) : null,
            )
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" className="chart-donut-center-value">
            {centerValue}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="chart-donut-center-label">
            {centerLabel}
          </text>
        </svg>
        <ul className="chart-legend">
          {slices.map((s) => (
            <li key={s.label}>
              <Tooltip content={`${s.label}: ${s.value} (${s.pct}%)`}>
                <span className="chart-legend-item">
                  <span className="chart-legend-dot" style={{ background: s.color }} />
                  {s.label}
                  <strong>{s.value}</strong>
                </span>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
