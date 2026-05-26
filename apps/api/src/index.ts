import express from "express";
import cors from "cors";
import { initDb } from "./db/index.js";
import { withLabClient } from "./db/client.js";
import { clientesRouter } from "./routes/clientes.js";
import { fornecedoresRouter } from "./routes/fornecedores.js";
import { estoqueRouter } from "./routes/estoque.js";
import { protesesRouter } from "./routes/proteses.js";
import { scannerRouter } from "./routes/scanner.js";
import { authRouter } from "./routes/auth.js";
import { licencasRouter } from "./routes/licencas.js";
import { usuariosRouter } from "./routes/usuarios.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { empresaRouter } from "./routes/empresa.js";
import { financeiroRouter } from "./routes/financeiro.js";
import { procedimentosRouter } from "./routes/procedimentos.js";
import { gruposRouter } from "./routes/grupos.js";
import {
  criarRegistroProtese,
  gerarEtiquetas3Vias,
  renderHtmlImpressao,
  type TamanhoEtiqueta,
} from "@dental/labels";
import { licenseGate } from "./middleware/license.js";
import { authGate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requirePolicy } from "./auth/rbac.js";
import {
  AUTH_REQUIRED,
  CORS_ORIGINS,
  DB_DRIVER,
  DEPLOYMENT_MODE,
  LICENSE_KEY,
  LICENSE_REQUIRED,
  LICENSE_SERVER_URL,
  PORT,
  TRIAL_DAYS,
} from "./config.js";
import { isRemoteLicenseEnabled } from "./licensing/remote-client.js";
import { startLicenseHeartbeat } from "./licensing/heartbeat.js";

await initDb();

if (LICENSE_REQUIRED && !LICENSE_KEY) {
  console.warn(
    "[dental-lab-api] DENTAL_LAB_LICENSE_REQUIRED=true mas DENTAL_LAB_LICENSE_KEY vazia — requisições retornarão 503.",
  );
}

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      if (CORS_ORIGINS.length === 0) {
        cb(null, true);
        return;
      }
      if (!origin) {
        cb(null, true);
        return;
      }
      if (CORS_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Dental-Lab-License", "X-Clinica-Id"],
  }),
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sistema: "Dental Lab + Clínica",
    versao: "0.4.0",
    modo: DEPLOYMENT_MODE,
    licencaObrigatoria: LICENSE_REQUIRED,
    authObrigatoria: AUTH_REQUIRED,
    dbDriver: DB_DRIVER,
    licencaRemota: isRemoteLicenseEnabled(),
    licencaServidorUrl: LICENSE_SERVER_URL || null,
    trialDias: TRIAL_DAYS,
  });
});

app.get("/api/license/status", (_req, res) => {
  res.json({
    deploymentMode: DEPLOYMENT_MODE,
    licenseRequired: LICENSE_REQUIRED,
    licenseKeyConfigured: LICENSE_KEY.length > 0,
    remoteLicenseEnabled: isRemoteLicenseEnabled(),
    licenseServerUrl: LICENSE_SERVER_URL || null,
    trialDays: TRIAL_DAYS,
  });
});

app.use(licenseGate);
app.use(authGate);
app.use("/api/auth", authRouter);
app.use("/api/licencas", licencasRouter);

app.get("/api/config/lab", requirePolicy("config", "read"), async (req, res) => {
  const cfg = await withLabClient(req.auth!.clinicaId, (db) => db.getLabConfig());
  res.json(cfg);
});

app.put("/api/config/lab", requirePolicy("config", "write"), async (req, res) => {
  const { nome, telefone, endereco, logoUrl, tamanhoEtiquetaPadrao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: "Nome da empresa é obrigatório" });
  if (logoUrl && !logoUrl.startsWith("data:image/")) {
    return res.status(400).json({ erro: "Logo deve ser PNG ou JPG (base64)" });
  }
  const tamanhosValidos = ["termica_100x50", "termica_50x30", "a4"];
  if (tamanhoEtiquetaPadrao && !tamanhosValidos.includes(tamanhoEtiquetaPadrao)) {
    return res.status(400).json({ erro: "Tamanho de etiqueta inválido", validos: tamanhosValidos });
  }
  const cfg = await withLabClient(req.auth!.clinicaId, async (db) => {
    const atual = await db.getLabConfig();
    const next = {
      nome: nome.trim(),
      telefone: telefone ?? atual.telefone,
      endereco: endereco ?? atual.endereco,
      logoUrl: logoUrl ?? atual.logoUrl ?? "",
      tamanhoEtiquetaPadrao: tamanhoEtiquetaPadrao ?? atual.tamanhoEtiquetaPadrao ?? "termica_100x50",
    };
    await db.setLabConfig(next);
    return next;
  });
  res.json(cfg);
});

app.get("/api/etiquetas/campos", requirePolicy("config", "read"), (_req, res) => {
  res.json([
    { campo: "Logo da empresa", origem: "config/lab.logoUrl", fallback: "Iniciais do nome" },
    { campo: "Nome do paciente", origem: "clientes.nome", fallback: null },
    { campo: "Telefone", origem: "clientes.telefone", fallback: "—" },
    { campo: "Nº da amostra", origem: "proteses.codigo", fallback: null },
    { campo: "Nome da amostra", origem: "proteses.tipo_protese + dentes", fallback: null },
    { campo: "Data", origem: "proteses.data_entrada", fallback: null },
    { campo: "Código de barras", origem: "proteses.codigo_barras", fallback: null, tipo: "Code128" },
  ]);
});

/** Etiqueta de calibração (sem prótese real) — validação na impressora 100×50 mm. */
app.get("/api/etiquetas/teste-impressao", requirePolicy("config", "read"), async (req, res) => {
  const tamanho = (req.query.tamanho as TamanhoEtiqueta) ?? "termica_100x50";
  const cfg = await withLabClient(req.auth!.clinicaId, (db) => db.getLabConfig());
  const hoje = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const demo = criarRegistroProtese({
    id: "teste",
    codigo: `PROT-${hoje}-TEST`,
    codigoBarras: `PROT-${hoje}-TEST`,
    pacienteId: "demo",
    paciente: { id: "demo", nome: "Paciente Teste Calibração", telefone: "(11) 99999-0000" },
    dentista: { id: "d1", nome: "Dr. Calibração" },
    tipoProtese: "Coroa teste 100x50",
    dentes: "11, 21",
    dataEntrada: new Date().toISOString().slice(0, 10),
    status: "recebido",
  });
  const etiqueta = await gerarEtiquetas3Vias(demo, tamanho, cfg);
  res.type("html").send(renderHtmlImpressao(etiqueta, cfg));
});

app.use("/api/clientes", clientesRouter);
app.use("/api/fornecedores", fornecedoresRouter);
app.use("/api/estoque", estoqueRouter);
app.use("/api/proteses", protesesRouter);
app.use("/api/scanner", scannerRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/relatorios", relatoriosRouter);
app.use("/api/empresa", empresaRouter);
app.use("/api/financeiro", financeiroRouter);
app.use("/api/procedimentos", procedimentosRouter);
app.use("/api/grupos", gruposRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  startLicenseHeartbeat();
  console.log(
    `API Dental Lab em http://localhost:${PORT} (modo ${DEPLOYMENT_MODE}, db ${DB_DRIVER}, licença ${LICENSE_REQUIRED ? "on" : "off"}, auth ${AUTH_REQUIRED ? "on" : "off"})`,
  );
});
