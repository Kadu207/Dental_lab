import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_DENTAL_LAB_BASE_PATH || "/";

  return {
    base,
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
