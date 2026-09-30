/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origem da API (ex.: `http://localhost:3333` ou vazio para mesmo host / proxy). */
  readonly VITE_DENTAL_LAB_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
