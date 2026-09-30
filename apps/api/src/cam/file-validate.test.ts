import { describe, expect, it } from "vitest";
import { validateCamScanFile } from "./file-validate.js";

describe("validateCamScanFile", () => {
  it("aceita ASCII STL solid test\\nendsolid", () => {
    const result = validateCamScanFile({
      filename: "scan.stl",
      buffer: Buffer.from("solid test\nendsolid"),
    });
    expect(result.kind).toBe("stl");
    expect(result.mime).toBe("model/stl");
  });

  it("rejeita .html", () => {
    expect(() =>
      validateCamScanFile({
        filename: "page.html",
        buffer: Buffer.from("<html><body>x</body></html>"),
      }),
    ).toThrow("TIPO_ARQUIVO_NAO_PERMITIDO");
  });

  it("rejeita buffer PDF com nome .stl", () => {
    expect(() =>
      validateCamScanFile({
        filename: "scan.stl",
        buffer: Buffer.from("%PDF-1.4\n1 0 obj"),
      }),
    ).toThrow("CONTEUDO_ARQUIVO_INVALIDO");
  });

  it("aceita PLY ply\\nformat ascii 1.0\\n", () => {
    const result = validateCamScanFile({
      filename: "mesh.ply",
      buffer: Buffer.from("ply\nformat ascii 1.0\n"),
    });
    expect(result.kind).toBe("ply");
    expect(result.mime).toBe("text/plain");
  });

  it("rejeita exe MZ", () => {
    const exe = Buffer.alloc(90, 0);
    exe[0] = 0x4d;
    exe[1] = 0x5a;
    expect(() =>
      validateCamScanFile({
        filename: "scan.stl",
        buffer: exe,
      }),
    ).toThrow("CONTEUDO_ARQUIVO_INVALIDO");
  });
});
