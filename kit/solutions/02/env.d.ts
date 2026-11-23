/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API : https://dummyjson.com par défaut. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
