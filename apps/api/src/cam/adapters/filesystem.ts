import fs from "fs/promises";
import path from "path";
import type { CamAdapter, CamJobContext, CamJobResult } from "../types.js";
import { hotFolderDir, jobsDir } from "../storage-paths.js";

/**
 * Adapter filesystem: copia o scan para hot folder e marca `.done` (piloto sem máquina real).
 */
export const filesystemAdapter: CamAdapter = {
  id: "filesystem",
  label: "Filesystem (hot folder)",
  capabilities: ["print", "mill", "ingest"],
  available: true,
  async sendJob(ctx: CamJobContext): Promise<CamJobResult> {
    const hot = hotFolderDir(ctx.clinicaId, "filesystem");
    const outJob = jobsDir(ctx.clinicaId, ctx.pacienteId, ctx.jobId);
    await fs.mkdir(hot, { recursive: true });
    await fs.mkdir(outJob, { recursive: true });

    const destName = `${ctx.jobId}_${ctx.sourceFilename}`;
    const dest = path.join(hot, destName);
    await fs.copyFile(ctx.sourceFilePath, dest);
    await fs.writeFile(`${dest}.done`, `ok ${new Date().toISOString()} capability=${ctx.capability}\n`, "utf8");
    await fs.copyFile(dest, path.join(outJob, ctx.sourceFilename));

    return {
      status: "done",
      mensagem: `Arquivo enviado à hot folder (${ctx.capability})`,
      externalRef: dest,
      outputPath: outJob,
    };
  },
};
