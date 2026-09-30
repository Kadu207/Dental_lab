export type CamCapability = "print" | "mill" | "ingest";

export type CamJobStatus = "queued" | "sent" | "done" | "fail" | "stub";

export type CamAdapter = {
  id: string;
  label: string;
  capabilities: CamCapability[];
  /** false = slot reservado / SDK futuro */
  available: boolean;
  sendJob: (ctx: CamJobContext) => Promise<CamJobResult>;
  getStatus?: (ctx: { clinicaId: number; jobId: string; externalRef?: string }) => Promise<CamJobStatus>;
};

export type CamJobContext = {
  clinicaId: number;
  jobId: string;
  pacienteId: string;
  capability: CamCapability;
  perfil?: string;
  sourceFilePath: string;
  sourceFilename: string;
};

export type CamJobResult = {
  status: CamJobStatus;
  mensagem?: string;
  externalRef?: string;
  outputPath?: string;
};
