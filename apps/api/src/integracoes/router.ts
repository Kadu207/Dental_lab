import { Router } from "express";
import { requireSupervisor } from "../auth/rbac.js";
import {
  dispatchToChannels,
  getIntegrationsStatus,
  shouldEmitIntegrations,
  type IntegrationEventType,
} from "./emit.js";

export const integracoesRouter = Router();

integracoesRouter.use(requireSupervisor());

integracoesRouter.get("/status", (_req, res) => {
  res.json(getIntegrationsStatus());
});

integracoesRouter.post("/n8n/disparar", async (req, res) => {
  if (!shouldEmitIntegrations()) {
    return res.status(503).json({
      erro: "Integrações desabilitadas (INTEGRATIONS_ENABLED / modo embedded)",
      code: "INTEGRATIONS_DISABLED",
      status: getIntegrationsStatus(),
    });
  }
  const type = (String(req.body?.type ?? "manual_test") as IntegrationEventType) || "manual_test";
  const data =
    req.body?.data && typeof req.body.data === "object"
      ? (req.body.data as Record<string, unknown>)
      : { note: "disparo manual supervisor" };
  const results = await dispatchToChannels(type, data, ["n8n"]);
  res.json({ msg: "Disparo N8N concluído", results });
});

integracoesRouter.post("/chatwoot/enviar", async (req, res) => {
  if (!shouldEmitIntegrations()) {
    return res.status(503).json({
      erro: "Integrações desabilitadas (INTEGRATIONS_ENABLED / modo embedded)",
      code: "INTEGRATIONS_DISABLED",
      status: getIntegrationsStatus(),
    });
  }
  const type = (String(req.body?.type ?? "manual_test") as IntegrationEventType) || "manual_test";
  const data =
    req.body?.data && typeof req.body.data === "object"
      ? (req.body.data as Record<string, unknown>)
      : { note: "disparo manual supervisor" };
  const results = await dispatchToChannels(type, data, ["chatwoot"]);
  res.json({ msg: "Disparo Chatwoot concluído", results });
});
