import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Cache fora de apps/web (integridade High no Windows bloqueia node_modules/.vite). */
const cacheDir = path.resolve(__dirname, "../../infra/.vite-cache-web");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_DENTAL_LAB_BASE_PATH || "/";

  return {
    base,
    cacheDir,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:3333",
        "/lab-api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
