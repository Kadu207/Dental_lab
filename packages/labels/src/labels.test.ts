import { describe, expect, it } from "vitest";
import { gerarCodigoProtese } from "./labels.js";

describe("gerarCodigoProtese", () => {
  it("generates PROT-AAAAMMDD-XXXX format", () => {
    const { codigo, codigoBarras } = gerarCodigoProtese(42);
    expect(codigo).toMatch(/^PROT-\d{8}-0042$/);
    expect(codigoBarras).toBe(codigo);
  });

  it("pads sequence to 4 digits", () => {
    const { codigo } = gerarCodigoProtese(1);
    expect(codigo.endsWith("-0001")).toBe(true);
  });
});
