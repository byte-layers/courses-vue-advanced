// URL de base de l'API : DummyJSON par défaut, le serveur local de repli via .env.local.
export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'https://dummyjson.com').replace(
  /\/$/,
  '',
)
