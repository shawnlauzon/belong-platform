/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add any other environment variables you're using
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
