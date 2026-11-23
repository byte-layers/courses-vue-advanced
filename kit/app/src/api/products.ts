import { API_URL } from './config'
import type { Product, ProductList } from '@/features/products/types'

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${path}`)
  return (await response.json()) as T
}

export function listProducts(params: { limit?: number; skip?: number } = {}, signal?: AbortSignal) {
  const { limit = 12, skip = 0 } = params
  return getJson<ProductList>(`/products?limit=${limit}&skip=${skip}`, signal)
}

export function getProduct(id: number, signal?: AbortSignal) {
  return getJson<Product>(`/products/${id}`, signal)
}

/** Recherche plein texte : GET /products/search?q= */
export function searchProducts(q: string, signal?: AbortSignal) {
  return getJson<ProductList>(`/products/search?q=${encodeURIComponent(q)}&limit=12`, signal)
}
