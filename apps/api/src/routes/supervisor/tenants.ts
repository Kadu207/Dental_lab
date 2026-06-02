import { Router } from "express";
import { ALLOWED_PERIODS, ALLOWED_PRODUCTS } from "../../licensing/core.js";
import {
  generateLicenseForTenant,
  listLicensesForTenant,
  serializeLicenseRow,
} from "../../licensing/tenant-licenses.js";
import { buildStatusWithTrial } from "../../licensing/service.js";
import { isRemoteLicenseEnabled, remoteLicenseStatus } from "../../licensing/remote-client.js";
import { requireSupervisor } from "../../auth/rbac.js";
import { withLabClient } from "../../db/client.js";
import { createTenant, deleteTenant, getTenant, listTenants, setTenantsStatus, updateTenant } from "../../tenants/registry.js";
import { parseTenantPayload } from "../../tenants/tenant-fields.js";
import { listTenantsOverview } from "../../tenants/tenant-overview.js";
import { syncAllTenantLicensesFromRemote, syncTenantLicenseFromRemote } from "../../licensing/tenant-sync.js";

export const supervisorTenantsRouter = Router();

supervisorTenantsRouter.use(requireSupervisor());

supervisorTenantsRouter.get("/overview", async (_req, res) => {
  try {
    const rows = await listTenantsOverview();
    res.json(rows);
  } catch (e) {
    res.status(503).json({
      erro: e instanceof Error ? e.message : "Falha ao listar empresas",
      code: "TENANT_REGISTRY_UNAVAILABLE",
    });
  }
});

supervisorTenantsRouter.post("/bulk-status", async (req, res) => {
  const clinicaIds = Array.isArray(req.body?.clinicaIds)
    ? (req.body.clinicaIds as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const status = req.body?.status;
  if (clinicaIds.length === 0) {
    return res.status(400).json({ erro: "Informe clinicaIds" });
  }
  if (status !== "active" && status !== "suspended") {
    return res.status(400).json({ erro: "status deve ser active ou suspended" });
  }
  if (clinicaIds.includes(1) && status === "suspended") {
    return res.status(400).json({ erro: "Não é permitido suspender o tenant padrão (#1)" });
  }
  try {
    const updated = await setTenantsStatus(clinicaIds, status);
    res.json({ msg: `${updated} empresa(s) atualizada(s)`, updated });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha na operação em lote" });
  }
});

supervisorTenantsRouter.get("/", async (_req, res) => {
  try {
    const rows = await listTenants();
    res.json(rows);
  } catch (e) {
    res.status(503).json({
      erro: e instanceof Error ? e.message : "Registry de tenants indisponível",
      code: "TENANT_REGISTRY_UNAVAILABLE",
    });
  }
});

supervisorTenantsRouter.get("/:clinicaId", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }
  try {
    const row = await getTenant(clinicaId);
    if (!row) return res.status(404).json({ erro: "Tenant não encontrado" });
    res.json(row);
  } catch (e) {
    res.status(503).json({
      erro: e instanceof Error ? e.message : "Registry de tenants indisponível",
      code: "TENANT_REGISTRY_UNAVAILABLE",
    });
  }
});

supervisorTenantsRouter.post("/", async (req, res) => {
  const payload = parseTenantPayload(req.body as Record<string, unknown>);

  if (!payload.razaoSocial && !payload.nomeFantasia) {
    return res.status(400).json({ erro: "Informe razaoSocial ou nomeFantasia" });
  }

  try {
    const created = await createTenant(payload);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao criar tenant" });
  }
});

supervisorTenantsRouter.get("/:clinicaId/licenca/status", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }
  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const local = await withLabClient(clinicaId, async (db) => buildStatusWithTrial(db, clinicaId, null));

    let remoteStatus: Record<string, unknown> | null = null;
    let remoteError: string | null = null;
    if (isRemoteLicenseEnabled()) {
      try {
        const remote = await remoteLicenseStatus({ clinicaId, unidadeId: null });
        remoteStatus = remote as Record<string, unknown>;
      } catch (e) {
        remoteError = e instanceof Error ? e.message : "Falha ao consultar Gerador";
      }
    }

    res.json({
      tenant,
      localStatus: local,
      remoteStatus,
      remoteError,
      remoteEnabled: isRemoteLicenseEnabled(),
      geradorUrl: process.env.DENTAL_LAB_LICENSE_SERVER_URL?.trim() || "https://licencas.inovatitech.com.br",
    });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao consultar licença" });
  }
});

supervisorTenantsRouter.get("/:clinicaId/licencas", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }
  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });
    const rows = await withLabClient(clinicaId, async (db) => listLicensesForTenant(db, clinicaId));
    res.json(rows.map((r) => serializeLicenseRow(r, tenant)));
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao listar licenças" });
  }
});

supervisorTenantsRouter.post("/:clinicaId/licencas/gerar", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
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
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const row = await withLabClient(clinicaId, async (db) =>
      generateLicenseForTenant(db, clinicaId, {
        produto,
        periodo,
        clienteNome: String(
          req.body?.clienteNome ?? req.body?.cliente_nome ?? tenant.razaoSocial ?? tenant.nomeFantasia ?? "",
        ),
        notes: String(req.body?.notes ?? ""),
        createdBy: req.auth?.sub ?? "supervisor",
      }),
    );
    res.status(201).json(serializeLicenseRow(row, tenant));
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao gerar licença" });
  }
});

supervisorTenantsRouter.post("/sync-licencas", async (_req, res) => {
  try {
    const results = await syncAllTenantLicensesFromRemote();
    res.json({
      msg: "Sincronização concluída",
      synced: results.length,
      results,
    });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao sincronizar licenças" });
  }
});

supervisorTenantsRouter.post("/:clinicaId/sync-licenca", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }
  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });
    const result = await syncTenantLicenseFromRemote(clinicaId);
    res.json({ msg: "Sincronização concluída", result });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao sincronizar licença" });
  }
});

supervisorTenantsRouter.put("/:clinicaId", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }

  const payload = parseTenantPayload(req.body as Record<string, unknown>);

  if (clinicaId === 1 && payload.status === "suspended") {
    return res.status(400).json({ erro: "Não é permitido suspender o tenant padrão" });
  }

  try {
    const current = await getTenant(clinicaId);
    if (!current) return res.status(404).json({ erro: "Tenant não encontrado" });

    const merged = { ...current, ...payload };
    const updated = await updateTenant(clinicaId, merged);
    if (!updated) return res.status(404).json({ erro: "Tenant não encontrado" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao atualizar tenant" });
  }
});

supervisorTenantsRouter.delete("/:clinicaId", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }
  try {
    const ok = await deleteTenant(clinicaId);
    if (!ok) return res.status(404).json({ erro: "Tenant não encontrado" });
    res.json({ msg: `Empresa #${clinicaId} removida do cadastro` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao remover tenant";
    res.status(msg.includes("padrão") ? 400 : 500).json({ erro: msg });
  }
});
