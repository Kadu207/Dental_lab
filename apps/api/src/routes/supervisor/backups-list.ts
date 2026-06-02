import { Router } from "express";
import { requireSupervisor } from "../../auth/rbac.js";
import { listBackupLogs } from "../../tenants/backup-log.js";

export const supervisorBackupsListRouter = Router();

supervisorBackupsListRouter.use(requireSupervisor());

supervisorBackupsListRouter.get("/", async (_req, res) => {
  try {
    const rows = await listBackupLogs(200);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : "Falha ao listar backups" });
  }
});
