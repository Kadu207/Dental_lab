import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/proteses",
    title: "Próteses e trabalhos",
    desc: "Cadastro, status, impressão de etiquetas 3 vias e rastreio no laboratório.",
  },
  {
    to: "/scanner",
    title: "Leitor de código de barras",
    desc: "Avanço rápido de status na bancada (Recebido → Entregue).",
  },
  {
    to: "/estoque",
    title: "Matéria-prima",
    desc: "Insumos e alertas de estoque mínimo para produção.",
  },
  {
    to: "/configuracao",
    title: "Etiquetas e dados da empresa",
    desc: "Logo, nome do laboratório e campos que aparecem nas vias impressas.",
  },
];

/**
 * Hub “Laboratório” — ponto de entrada para fluxo de laboratório/próteses.
 * O layout fino pode ser substituído pelo bundle vindo do Lovable (zip no frontend).
 */
export default function LaboratorioPage() {
  return (
    <>
      <div className="page-header">
        <h2>Laboratório</h2>
        <p style={{ marginTop: "0.35rem", maxWidth: "640px", color: "var(--muted)" }}>
          Área dedicada à produção de trabalhos protéticos e à operação do laboratório. Use o menu lateral ou os
          atalhos abaixo.
        </p>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="stat-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="lbl" style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              {c.title}
            </div>
            <div className="lbl" style={{ opacity: 0.85, fontSize: "0.9rem", lineHeight: 1.45 }}>
              {c.desc}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
