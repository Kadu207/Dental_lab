import { Router } from "express";
import { requireSupervisor } from "../../auth/rbac.js";
import { exportTenantBackup, importBackupToNewTenant, importTenantBackup } from "../../tenants/backup.js";
import { countBundleRows, listBackupLogs, logBackupExport } from "../../tenants/backup-log.js";
import { getTenant } from "../../tenants/registry.js";

type TenantRouteParams = { clinicaId: string };

export const supervisorBackupRouter = Router({ mergeParams: true });

supervisorBackupRouter.use(requireSupervisor());

supervisorBackupRouter.get("/export", async (req, res) => {
  const clinicaId = Number((req.params as TenantRouteParams).clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }

  try {
    const tenant = await getTenant(clinicaId);
    if (!tenant) return res.status(404).json({ erro: "Tenant não encontrado" });

    const bundle = await exportTenantBackup(clinicaId);
    const filename = `dental-lab-tenant-${clinicaId}-${new Date().toISOString().slice(0, 10)}.json`;
    const rowCount = countBundleRows(bundle);
    const notes = String(req.query.notes ?? "").trim();

    await logBackupExport({
      clinicaId,
      postgresSchema: tenant.postgresSchema,
      filename,
      rowCount,
      notes: notes || undefined,
      createdBy: req.auth?.sub ?? "supervisor",
    });

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(bundle, null, 2));
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao exportar backup" });
  }
});

supervisorBackupRouter.post("/import", async (req, res) => {
  const clinicaId = Number((req.params as TenantRouteParams).clinicaId);
  if (!Number.isFinite(clinicaId) || clinicaId <= 0) {
    return res.status(400).json({ erro: "clinicaId inválido" });
  }

  const { bundle, replace } = req.body as { bundle?: unknown; replace?: boolean };
  if (!bundle || typeof bundle !== "object") {
    return res.status(400).json({ erro: "Corpo deve incluir objeto bundle" });
  }

  try {
    const result = await importTenantBackup(clinicaId, bundle as Parameters<typeof importTenantBackup>[1], {
      replace: replace === true,
    });
    res.json({
      msg: "Importação concluída",
      ...result,
      replace: replace === true,
    });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao importar backup" });
  }
});

/** Importa backup lógico criando um novo tenant (schema lab_tN). */
export const supervisorBackupNewRouter = Router();

supervisorBackupNewRouter.use(requireSupervisor());

supervisorBackupNewRouter.post("/import", async (req, res) => {
  const { bundle, nomeFantasia, razaoSocial, cnpj, clienteCodigo } = req.body as {
    bundle?: unknown;
    nomeFantasia?: string;
    razaoSocial?: string;
    cnpj?: string;
    clienteCodigo?: string;
  };

  if (!bundle || typeof bundle !== "object") {
    return res.status(400).json({ erro: "Corpo deve incluir objeto bundle" });
  }

  try {
    const result = await importBackupToNewTenant(bundle as Parameters<typeof importBackupToNewTenant>[0], {
      nomeFantasia,
      razaoSocial,
      cnpj,
      clienteCodigo,
    });
    res.status(201).json({
      msg: "Novo tenant criado e backup importado",
      tenant: result.tenant,
      importedRows: result.importedRows,
    });
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao importar para novo tenant" });
  }
});
