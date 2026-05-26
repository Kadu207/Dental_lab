/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origem da API (ex.: `http://localhost:3333` ou vazio para mesmo host / proxy). */
  readonly VITE_DENTAL_LAB_API_URL?: string;
  /** Opcional: mesmo valor de `DENTAL_LAB_LICENSE_KEY` quando o módulo roda com licença obrigatória. Nunca commite em produção — prefira proxy do ERP. */
  readonly VITE_DENTAL_LAB_LICENSE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
