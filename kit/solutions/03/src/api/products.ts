import { http } from './http'
import type { Product, ProductList } from '@/features/products/types'

// Tous les appels passent par le client unique (Bearer, renouvellement de jeton, erreurs typées).

export function listProducts(params: { limit?: number; skip?: number } = {}, signal?: AbortSignal) {
  const { limit = 12, skip = 0 } = params
  return http.get<ProductList>(`/products?limit=${limit}&skip=${skip}`, { signal })
}

export function getProduct(id: number, signal?: AbortSignal) {
  return http.get<Product>(`/products/${id}`, { signal })
}

/** Recherche plein texte : GET /products/search?q= */
export function searchProducts(q: string, signal?: AbortSignal) {
  return http.get<ProductList>(`/products/search?q=${encodeURIComponent(q)}&limit=12`, { signal })
}
