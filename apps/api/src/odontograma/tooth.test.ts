import { describe, expect, it } from "vitest";
import {
  OdontogramaValidationError,
  TOOTH_CONDITION_IDS,
  isPermanentFdi,
  parseDentesLenient,
  parseDentesStrict,
  resolveDentesPayload,
} from "./tooth.js";

describe("parseDentesStrict", () => {
  it("aceita todas as condições da allowlist", () => {
    for (const condition of TOOTH_CONDITION_IDS) {
      expect(parseDentesStrict([{ fdi: 11, condition }])).toEqual([{ fdi: 11, condition }]);
    }
    expect(TOOTH_CONDITION_IDS).toEqual([
      "sadio",
      "carie",
      "restauracao",
      "coroa",
      "canal",
      "implante",
      "protese",
      "extracao",
      "ausente",
    ]);
  });

  it("rejeita condition livre (XSS / case / tipo)", () => {
    expect(() => parseDentesStrict([{ fdi: 11, condition: "<script>" }])).toThrow(
      OdontogramaValidationError,
    );
    expect(() => parseDentesStrict([{ fdi: 11, condition: "Carie" }])).toThrow(
      /Condição de dente inválida/,
    );
    expect(() => parseDentesStrict([{ fdi: 11, condition: { x: 1 } }])).toThrow(
      /Condição de dente inválida/,
    );
  });

  it("rejeita FDI fora da arcada permanente (incluindo decíduos)", () => {
    expect(() => parseDentesStrict([{ fdi: 99, condition: "sadio" }])).toThrow(/FDI inválido/);
    expect(() => parseDentesStrict([{ fdi: 51, condition: "carie" }])).toThrow(/FDI inválido/);
    expect(() => parseDentesStrict([{ fdi: 19, condition: "sadio" }])).toThrow(/FDI inválido/);
  });

  it("rejeita FDI duplicado e não-array", () => {
    expect(() =>
      parseDentesStrict([
        { fdi: 11, condition: "carie" },
        { fdi: 11, condition: "sadio" },
      ]),
    ).toThrow(/FDI duplicado/);
    expect(() => parseDentesStrict({ fdi: 11 })).toThrow(/deve ser um array/);
  });

  it("FDI 11–18, 21–28, 31–38, 41–48 são válidos", () => {
    const quadrantes = [1, 2, 3, 4];
    for (const q of quadrantes) {
      for (const pos of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const fdi = q * 10 + pos;
        expect(isPermanentFdi(fdi)).toBe(true);
      }
    }
    expect(isPermanentFdi(10)).toBe(false);
    expect(isPermanentFdi(51)).toBe(false);
  });
});

describe("parseDentesLenient", () => {
  it("GET antigo: condição desconhecida vira sadio e FDI inválido é ignorado", () => {
    expect(
      parseDentesLenient([
        { fdi: 11, condition: "xss" },
        { fdi: 99, condition: "carie" },
        { fdi: 21, condition: "implante", note: "ok" },
      ]),
    ).toEqual([
      { fdi: 11, condition: "sadio" },
      { fdi: 21, condition: "implante", note: "ok" },
    ]);
  });
});

describe("resolveDentesPayload", () => {
  it("PUT sem dentes grava lista vazia (compatível)", () => {
    expect(resolveDentesPayload({})).toEqual([]);
  });

  it("PUT com dentes inválidos falha", () => {
    expect(() => resolveDentesPayload({ dentes: [{ fdi: 11, condition: "livre" }] })).toThrow(
      /Condição de dente inválida/,
    );
  });

  it("PUT com dentes válidos aceita", () => {
    expect(resolveDentesPayload({ dentes: [{ fdi: 48, condition: "ausente" }] })).toEqual([
      { fdi: 48, condition: "ausente" },
    ]);
  });
});
