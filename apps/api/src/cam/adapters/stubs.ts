import fs from "fs/promises";
import path from "path";
import type { CamAdapter, CamJobContext, CamJobResult } from "../types.js";
import { hotFolderDir, jobsDir } from "../storage-paths.js";

async function sendViaHotFolder(ctx: CamJobContext, adapterId: string): Promise<CamJobResult> {
  const hot = hotFolderDir(ctx.clinicaId, adapterId);
  const outJob = jobsDir(ctx.clinicaId, ctx.pacienteId, ctx.jobId);
  await fs.mkdir(hot, { recursive: true });
  await fs.mkdir(outJob, { recursive: true });

  const destName = `${ctx.jobId}_${ctx.sourceFilename}`;
  const dest = path.join(hot, destName);
  await fs.copyFile(ctx.sourceFilePath, dest);
  await fs.writeFile(
    `${dest}.done`,
    `ok ${new Date().toISOString()} adapter=${adapterId} capability=${ctx.capability} perfil=${ctx.perfil ?? ""}\n`,
    "utf8",
  );
  await fs.copyFile(dest, path.join(outJob, ctx.sourceFilename));

  return {
    status: "done",
    mensagem: `Hot folder ${adapterId} (${ctx.capability})`,
    externalRef: dest,
    outputPath: outJob,
  };
}

/** Perfil piloto Elegoo Mars 5 Ultra via pasta (SDK/SDCP = 010.4). */
export const elegooMars5UltraAdapter: CamAdapter = {
  id: "elegoo_mars5_ultra",
  label: "Elegoo Mars 5 Ultra (hot folder / perfil piloto)",
  capabilities: ["print"],
  available: true,
  sendJob: (ctx) => sendViaHotFolder({ ...ctx, perfil: ctx.perfil ?? "mars5_ultra" }, "elegoo_mars5_ultra"),
};

/** Fresadora genérica via hot folder CAM. */
export const millGenericAdapter: CamAdapter = {
  id: "mill_generic",
  label: "Fresadora genérica (hot folder CAM)",
  capabilities: ["mill"],
  available: true,
  sendJob: (ctx) => sendViaHotFolder(ctx, "mill_generic"),
};

function reservedStub(
  id: string,
  label: string,
  capabilities: CamAdapter["capabilities"],
): CamAdapter {
  return {
    id,
    label,
    capabilities,
    available: false,
    async sendJob(): Promise<CamJobResult> {
      return {
        status: "stub",
        mensagem: `${label}: requer parceria/SDK — slot reservado (010.5)`,
      };
    },
  };
}

export const meditOpenApiAdapter = reservedStub("medit_open_api", "Medit Link Open API", ["ingest"]);
export const shiningOpenPlatformAdapter = reservedStub(
  "shining_open_platform",
  "Shining Open Platform",
  ["ingest"],
);
export const threeShapeUniteAdapter = reservedStub("threeshape_unite", "3Shape Unite Web Service", [
  "ingest",
]);
