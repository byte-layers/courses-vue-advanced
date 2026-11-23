import { http } from './http'
import {
  cartAddResponseSchema,
  categoriesSchema,
  productListSchema,
  productSchema,
} from '@/features/products/schemas'

// Tous les appels passent par le client unique, et chaque réponse est validée par un schéma zod :
// une réponse inattendue devient une erreur claire ici, pas un « undefined » dans un composant.

export interface ProductsQuery {
  limit?: number
  skip?: number
  /** Recherche plein texte (prioritaire sur la catégorie : DummyJSON ne combine pas les deux). */
  q?: string
  category?: string | null
}

export async function fetchProducts(query: ProductsQuery = {}, signal?: AbortSignal) {
  const { limit = 12, skip = 0, q = '', category = null } = query
  const paging = `limit=${limit}&skip=${skip}`
  const path = q.trim()
    ? `/products/search?q=${encodeURIComponent(q.trim())}&${paging}`
    : category
      ? `/products/category/${encodeURIComponent(category)}?${paging}`
      : `/products?${paging}`
  return productListSchema.parse(await http.get(path, { signal }))
}

export async function fetchProduct(id: number, signal?: AbortSignal) {
  return productSchema.parse(await http.get(`/products/${id}`, { signal }))
}

export async function fetchCategories(signal?: AbortSignal) {
  return categoriesSchema.parse(await http.get('/products/categories', { signal }))
}

/** POST /carts/add : simulé par DummyJSON (rien n'est enregistré), il répond 201 avec un panier fictif. */
export async function postCartAdd(productId: number, quantity: number) {
  const body = { userId: 1, products: [{ id: productId, quantity }] }
  return cartAddResponseSchema.parse(await http.post('/carts/add', body))
}
