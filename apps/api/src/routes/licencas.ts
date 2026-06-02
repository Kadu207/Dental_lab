import { Router } from "express";
import { ALLOWED_PERIODS, ALLOWED_PRODUCTS, PERIOD_LABELS, PRODUCT_LABELS } from "../licensing/core.js";
import {
  activateLicense,
  buildStatusWithTrial,
  generateLicense,
  listLicenses,
} from "../licensing/service.js";
import { withLabClient } from "../db/client.js";

export const licencasRouter = Router();

licencasRouter.get("/status", async (req, res) => {
  const clinicaId = req.auth?.clinicaId ?? Number(req.headers["x-clinica-id"] ?? 1);
  const unidadeId = (req.query.unidade_id ?? req.query.unidadeId) as string | undefined;
  const status = await withLabClient(clinicaId, async (db) =>
    buildStatusWithTrial(db, clinicaId, unidadeId || null),
  );
  res.json(status);
});

licencasRouter.post("/ativar", async (req, res) => {
  if (!req.auth) return res.status(401).json({ erro: "Não autenticado" });
  const licenseKey = String(req.body?.license_key ?? req.body?.licenseKey ?? "");
  const unidadeId = (req.body?.unidade_id ?? req.body?.unidadeId ?? null) as string | null;
  try {
    const row = await activateLicense(req.auth.clinicaId, licenseKey, unidadeId);
    const licenca = await withLabClient(req.auth.clinicaId, async (db) =>
      buildStatusWithTrial(db, req.auth!.clinicaId, unidadeId),
    );
    res.json({ msg: "OK", licenca, licenseKey: row.license_key, unidadeId: row.unidade_id });
  } catch (e) {
    const code = e instanceof Error ? e.message : "LICENSE_ERROR";
    const status =
      code === "LICENSE_NOT_FOUND" ? 404
      : code === "LICENSE_ALREADY_USED" || code === "LICENSE_SCOPE_MISMATCH" ? 409
      : code === "NO_SERVER" ? 503
      : 422;
    const mensagens: Record<string, string> = {
      INVALID_LICENSE_KEY: "A chave deve conter exatamente 25 caracteres alfanuméricos.",
      LICENSE_NOT_FOUND: "Chave de licença não encontrada.",
      LICENSE_REVOKED: "Licença revogada.",
      LICENSE_ALREADY_USED: "Licença já utilizada em outra clínica ou unidade.",
      LICENSE_SCOPE_MISMATCH: "Esta licença não pertence a esta unidade.",
      LICENSE_ACTIVATION_FAILED: "Falha ao ativar a licença.",
      NO_SERVER: "Servidor de licenças remoto indisponível ou não configurado.",
    };
    res.status(status).json({
      erro: mensagens[code] ?? code,
      code,
    });
  }
});

licencasRouter.get("/", async (req, res) => {
  if (!req.auth || !["admin", "gestor"].includes(req.auth.perfil)) {
    return res.status(403).json({ erro: "Sem permissão" });
  }
  const rows = await listLicenses();
  res.json(
    rows.map((row) => ({
      id: row.id,
      licenseKey: row.license_key,
      clinicaId: row.clinica_id,
      unidadeId: row.unidade_id,
      produto: row.produto,
      produtoLabel: PRODUCT_LABELS[row.produto] ?? row.produto,
      periodo: row.periodo,
      periodoLabel: PERIOD_LABELS[row.periodo] ?? row.periodo,
      clienteNome: row.cliente_nome,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      createdAt: row.created_at,
      createdBy: row.created_by,
      notes: row.notes,
    })),
  );
});

licencasRouter.post("/gerar", async (req, res) => {
  if (!req.auth || !["admin", "gestor"].includes(req.auth.perfil)) {
    return res.status(403).json({ erro: "Somente admin ou gestor pode gerar licenças" });
  }
  const produto = String(req.body?.produto ?? "lab").toLowerCase();
  const periodo = String(req.body?.periodo ?? "1y").toLowerCase();
  if (!ALLOWED_PRODUCTS.has(produto)) {
    return res.status(422).json({ erro: "INVALID_LICENSE_PRODUCT" });
  }
  if (!ALLOWED_PERIODS.has(periodo)) {
    return res.status(422).json({ erro: "INVALID_LICENSE_PERIOD" });
  }
  try {
    const row = await generateLicense({
      produto,
      periodo,
      clienteNome: String(req.body?.cliente_nome ?? req.body?.clienteNome ?? ""),
      clinicaId: req.body?.clinica_id ?? req.body?.clinicaId ?? null,
      unidadeId: req.body?.unidade_id ?? req.body?.unidadeId ?? null,
      createdBy: req.auth.sub,
      notes: String(req.body?.notes ?? ""),
    });
    res.json({
      msg: "OK",
      licenseKey: row.license_key,
      produto: row.produto,
      periodo: row.periodo,
      clienteNome: row.cliente_nome,
      clinicaId: row.clinica_id,
    });
  } catch {
    res.status(500).json({ erro: "LICENSE_GENERATION_FAILED" });
  }
});
