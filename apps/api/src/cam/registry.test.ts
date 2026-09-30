import { describe, expect, it } from "vitest";
import { listCamAdapters, getCamAdapter } from "./registry.js";
import { sanitizeFilename, sanitizeId } from "./storage-paths.js";

describe("cam storage sanitize", () => {
  it("bloqueia path traversal em id", () => {
    expect(sanitizeId("abc-123")).toBe("abc-123");
    expect(sanitizeId("../x")).toBe("__x");
    expect(sanitizeId("..")).toBe("_");
  });

  it("sanitiza nome de arquivo", () => {
    expect(sanitizeFilename("/tmp/evil/scan.stl")).toBe("scan.stl");
    expect(sanitizeFilename("modelo (1).ply")).toBe("modelo (1).ply");
  });
});

describe("cam registry", () => {
  it("lista adapters do piloto", () => {
    const list = listCamAdapters();
    const ids = list.map((a) => a.id);
    expect(ids).toContain("filesystem");
    expect(ids).toContain("elegoo_mars5_ultra");
    expect(ids).toContain("mill_generic");
    expect(getCamAdapter("filesystem")?.available).toBe(true);
    expect(getCamAdapter("elegoo_mars5_ultra")?.available).toBe(true);
    expect(getCamAdapter("medit_open_api")?.available).toBe(false);
  });
});
