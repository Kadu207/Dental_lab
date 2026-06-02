import { Router } from "express";
import { ALLOWED_PERIODS } from "../../licensing/core.js";
import {
  cancelLicenseForTenant,
  listAllLicensesForSupervisor,
  revokeLicenseForTenant,
  serializeLicenseRow,
  updateLicenseForTenant,
} from "../../licensing/tenant-licenses.js";
import { requireSupervisor } from "../../auth/rbac.js";
import { withLabClient } from "../../db/client.js";
import { getTenant } from "../../tenants/registry.js";

export const supervisorLicensesRouter = Router();

supervisorLicensesRouter.use(requireSupervisor());

supervisorLicensesRouter.get("/", async (_req, res) => {
  try {
    const rows = await listAllLicensesForSupervisor();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao listar licenças" });
  }
});

supervisorLicensesRouter.put("/:clinicaId/:id", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  const id = Number(req.params.id);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0 || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ erro: "Parâmetros inválidos" });
  }

  const periodo = req.body?.periodo != null ? String(req.body.periodo).toLowerCase() : undefined;
  if (periodo && !ALLOWED_PERIODS.has(periodo)) {
    return res.status(422).json({ erro: "INVALID_LICENSE_PERIOD" });
  }

  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const row = await withLabClient(clinicaId, async (db) =>
      updateLicenseForTenant(db, clinicaId, id, {
        clienteNome: req.body?.clienteNome != null ? String(req.body.clienteNome) : undefined,
        notes: req.body?.notes != null ? String(req.body.notes) : undefined,
        periodo,
      }),
    );
    res.json(serializeLicenseRow(row, tenant));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao editar licença";
    const code = msg === "LICENSE_NOT_FOUND" ? 404 : msg === "LICENSE_REVOKED" ? 409 : 500;
    res.status(code).json({ erro: msg });
  }
});

supervisorLicensesRouter.post("/:clinicaId/:id/cancelar", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  const id = Number(req.params.id);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0 || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ erro: "Parâmetros inválidos" });
  }

  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const row = await withLabClient(clinicaId, async (db) => cancelLicenseForTenant(db, clinicaId, id));
    res.json(serializeLicenseRow(row, tenant));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao cancelar licença";
    const code = msg === "LICENSE_NOT_FOUND" ? 404 : msg === "LICENSE_NOT_PENDING" ? 409 : 500;
    res.status(code).json({ erro: msg });
  }
});

supervisorLicensesRouter.post("/:clinicaId/:id/revogar", async (req, res) => {
  const clinicaId = Number(req.params.clinicaId);
  const id = Number(req.params.id);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0 || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ erro: "Parâmetros inválidos" });
  }

  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const row = await withLabClient(clinicaId, async (db) => revokeLicenseForTenant(db, clinicaId, id));
    res.json(serializeLicenseRow(row, tenant));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao revogar licença";
    res.status(msg === "LICENSE_NOT_FOUND" ? 404 : 500).json({ erro: msg });
  }
});
