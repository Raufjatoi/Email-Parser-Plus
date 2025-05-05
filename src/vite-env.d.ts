/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

