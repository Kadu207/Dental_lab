import { filesystemAdapter } from "./adapters/filesystem.js";
import {
  elegooMars5UltraAdapter,
  meditOpenApiAdapter,
  millGenericAdapter,
  shiningOpenPlatformAdapter,
  threeShapeUniteAdapter,
} from "./adapters/stubs.js";
import type { CamAdapter, CamCapability } from "./types.js";

const REGISTRY: CamAdapter[] = [
  filesystemAdapter,
  elegooMars5UltraAdapter,
  millGenericAdapter,
  meditOpenApiAdapter,
  shiningOpenPlatformAdapter,
  threeShapeUniteAdapter,
];

export function listCamAdapters(): Array<{
  id: string;
  label: string;
  capabilities: CamCapability[];
  available: boolean;
}> {
  return REGISTRY.map((a) => ({
    id: a.id,
    label: a.label,
    capabilities: a.capabilities,
    available: a.available,
  }));
}

export function getCamAdapter(id: string): CamAdapter | undefined {
  return REGISTRY.find((a) => a.id === id);
}
