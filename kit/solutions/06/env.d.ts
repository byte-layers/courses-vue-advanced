/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API : https://dummyjson.com par défaut. */
  readonly VITE_API_URL?: string
  /** URL du serveur d'enchères (socket.io) : http://localhost:4310 par défaut. */
  readonly VITE_SOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
