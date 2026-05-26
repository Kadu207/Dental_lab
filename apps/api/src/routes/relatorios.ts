import { Router } from "express";
import { requirePolicy } from "../auth/rbac.js";
import { withLabClient } from "../db/client.js";
import { STATUS_FLOW } from "@dental/labels";
import { getClinicaId } from "./helpers.js";

export const relatoriosRouter = Router();

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

relatoriosRouter.get("/producao.csv", requirePolicy("proteses", "read"), async (req, res) => {
  const de = (req.query.de as string | undefined)?.trim();
  const ate = (req.query.ate as string | undefined)?.trim();

  await withLabClient(getClinicaId(req), async (db) => {
    let sql = `SELECT p.*, c.nome as paciente_nome FROM proteses p
      LEFT JOIN clientes c ON c.id = p.paciente_id
      WHERE p.clinica_id = ?`;
    const params: unknown[] = [getClinicaId(req)];

    if (de) {
      sql += " AND p.data_entrada >= ?";
      params.push(de);
    }
    if (ate) {
      sql += " AND p.data_entrada <= ?";
      params.push(ate);
    }
    sql += " ORDER BY p.data_entrada DESC, p.codigo DESC";

    const rows = await db.queryAll<Record<string, unknown>>(sql, params);
    const header = [
      "codigo",
      "paciente",
      "tipo_protese",
      "status",
      "setor",
      "data_entrada",
      "data_prevista_entrega",
      "dentista",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.codigo),
          csvEscape(r.paciente_nome),
          csvEscape(r.tipo_protese),
          csvEscape(r.status),
          csvEscape(r.setor ?? "gesso"),
          csvEscape(r.data_entrada),
          csvEscape(r.data_prevista_entrega),
          csvEscape(r.dentista_nome),
        ].join(","),
      );
    }

    const filename = `producao-lab-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + lines.join("\n"));
  });
});

relatoriosRouter.get("/producao.html", requirePolicy("proteses", "read"), async (req, res) => {
  const de = (req.query.de as string | undefined)?.trim();
  const ate = (req.query.ate as string | undefined)?.trim();

  await withLabClient(getClinicaId(req), async (db) => {
    const cfg = await db.getLabConfig();
    let sql = `SELECT p.*, c.nome as paciente_nome FROM proteses p
      LEFT JOIN clientes c ON c.id = p.paciente_id
      WHERE p.clinica_id = ?`;
    const params: unknown[] = [getClinicaId(req)];
    if (de) {
      sql += " AND p.data_entrada >= ?";
      params.push(de);
    }
    if (ate) {
      sql += " AND p.data_entrada <= ?";
      params.push(ate);
    }
    sql += " ORDER BY p.data_entrada DESC LIMIT 500";
    const rows = await db.queryAll<Record<string, unknown>>(sql, params);

    const porStatus: Record<string, number> = {};
    for (const s of STATUS_FLOW) porStatus[s] = 0;
    for (const r of rows) {
      const st = String(r.status ?? "");
      porStatus[st] = (porStatus[st] ?? 0) + 1;
    }

    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${esc(r.codigo)}</td><td>${esc(r.paciente_nome)}</td><td>${esc(r.tipo_protese)}</td><td>${esc(r.status)}</td><td>${esc(r.setor)}</td><td>${esc(r.data_entrada)}</td><td>${esc(r.data_prevista_entrega)}</td></tr>`,
      )
      .join("");

    const resumo = Object.entries(porStatus)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `<li><strong>${esc(k)}</strong>: ${n}</li>`)
      .join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Relatório de produção — ${esc(cfg.nome)}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a1a2e}
h1{font-size:1.25rem} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:0.85rem}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#f1f5f9}.toolbar{margin:12px 0}
@media print{.toolbar{display:none}}
</style></head><body>
<h1>Relatório de produção — ${esc(cfg.nome)}</h1>
<p>Período: ${esc(de || "início")} até ${esc(ate || "hoje")} · ${rows.length} trabalho(s)</p>
<ul>${resumo}</ul>
<div class="toolbar"><button onclick="window.print()">Imprimir / PDF</button></div>
<table><thead><tr><th>Código</th><th>Paciente</th><th>Trabalho</th><th>Status</th><th>Setor</th><th>Entrada</th><th>Previsão</th></tr></thead>
<tbody>${rowsHtml}</tbody></table></body></html>`;
    res.type("html").send(html);
  });
});

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
