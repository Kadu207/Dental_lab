import path from "path";
import { sanitizeFilename } from "./storage-paths.js";

export type CamScanKind = "stl" | "ply" | "obj";

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const MIME_BY_KIND: Record<CamScanKind, string> = {
  stl: "model/stl",
  ply: "text/plain",
  obj: "model/obj",
};

const OBJ_TOKENS = new Set(["v", "vn", "vt", "f", "o", "g", "s", "mtllib", "usemtl"]);

const DANGEROUS_DECLARED_MIMES = new Set(["text/html", "application/javascript", "text/javascript"]);

export function validateCamScanFile(opts: {
  filename: string;
  buffer: Buffer;
  declaredMime?: string | null;
}): { kind: CamScanKind; mime: string } {
  const kind = kindFromFilename(opts.filename);
  assertSafeDeclaredMime(opts.declaredMime);
  assertNoDangerousMagic(opts.buffer);
  assertContentMatchesKind(kind, opts.buffer);
  return { kind, mime: MIME_BY_KIND[kind] };
}

function kindFromFilename(filename: string): CamScanKind {
  let base: string;
  try {
    base = sanitizeFilename(filename);
  } catch {
    throw new Error("TIPO_ARQUIVO_NAO_PERMITIDO");
  }
  const ext = path.extname(base).toLowerCase();
  if (ext === ".stl") return "stl";
  if (ext === ".ply") return "ply";
  if (ext === ".obj") return "obj";
  throw new Error("TIPO_ARQUIVO_NAO_PERMITIDO");
}

function assertSafeDeclaredMime(declaredMime?: string | null) {
  if (!declaredMime) return;
  const media = declaredMime.split(";")[0].trim().toLowerCase();
  if (DANGEROUS_DECLARED_MIMES.has(media)) {
    throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
  }
}

function assertNoDangerousMagic(buffer: Buffer) {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
  }

  const textHead = skipBom(buffer)
    .subarray(0, Math.min(buffer.length, 64))
    .toString("utf8")
    .trimStart()
    .toLowerCase();
  if (textHead.startsWith("<html") || textHead.startsWith("<!doctype")) {
    throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
  }
}

function assertContentMatchesKind(kind: CamScanKind, buffer: Buffer) {
  switch (kind) {
    case "stl":
      if (!isValidStl(buffer)) throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
      return;
    case "ply":
      if (!isValidPly(buffer)) throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
      return;
    case "obj":
      if (!isValidObj(buffer)) throw new Error("CONTEUDO_ARQUIVO_INVALIDO");
      return;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Tipo CAM não tratado: ${_exhaustive}`);
    }
  }
}

function isValidStl(buffer: Buffer): boolean {
  const text = skipBom(buffer).toString("utf8");
  if (text.trimStart().toLowerCase().startsWith("solid")) return true;
  if (buffer.length < 84) return false;
  const triangleCount = buffer.readUInt32LE(80);
  return 84 + 50 * triangleCount === buffer.length;
}

function isValidPly(buffer: Buffer): boolean {
  const head = skipBom(buffer)
    .subarray(0, Math.min(buffer.length, 16))
    .toString("utf8")
    .trimStart()
    .toLowerCase();
  return head.startsWith("ply");
}

function isValidObj(buffer: Buffer): boolean {
  const text = skipBom(buffer).toString("utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const token = line.split(/\s+/)[0] ?? "";
    return OBJ_TOKENS.has(token);
  }
  return false;
}

function skipBom(buffer: Buffer): Buffer {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(UTF8_BOM)) {
    return buffer.subarray(3);
  }
  return buffer;
}
