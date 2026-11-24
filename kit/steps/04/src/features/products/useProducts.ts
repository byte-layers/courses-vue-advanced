/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { Category } from './schemas'
import type { Product } from './types'

export interface ProductsParams {
  /** Page courante, à partir de 1. */
  page: MaybeRefOrGetter<number>
  pageSize?: number
  /** Texte de recherche (déjà « debounced » par l'appelant). */
  search?: MaybeRefOrGetter<string>
  category?: MaybeRefOrGetter<string | null>
}

export interface UseProductsResult {
  products: ComputedRef<Product[]>
  total: ComputedRef<number>
  pageCount: ComputedRef<number>
  isPending: Ref<boolean>
  isFetching: Ref<boolean>
  isError: Ref<boolean>
  error: Ref<Error | null>
  /** Réponse reçue, sans erreur, mais aucun produit. */
  isEmpty: ComputedRef<boolean>
  refetch: () => Promise<unknown>
}

/**
 * TODO 1 — Le catalogue paginé avec `useQuery` (de @tanstack/vue-query).
 *  - `queryKey` : un `computed` qui lit les paramètres réactifs (`toValue`) et appelle
 *    `productKeys.list({ page, pageSize, search, category })` (voir queryKeys.ts) ;
 *  - `queryFn: ({ queryKey, signal }) => fetchProducts({ limit, skip, q, category }, signal)`, avec
 *    `skip = (page - 1) * pageSize` (pageSize vaut 12 par défaut). Lisez page, search et category
 *    dans la clé REÇUE (`queryKey[2]`), pas dans la valeur courante du `computed` : après un échec,
 *    la nouvelle tentative doit refaire la requête de SA clé ;
 *  - `placeholderData: keepPreviousData` : pas de page blanche entre deux pages ;
 *  - `staleTime: 30_000` ;
 *  - renvoyez `products`, `total`, `pageCount` (= ceil(total / pageSize)) et `isEmpty`
 *    (succès ET aucun produit), plus `isPending`, `isFetching`, `isError`, `error`, `refetch`.
 */
export function useProducts(params: ProductsParams): UseProductsResult {
  throw new Error('À écrire')
}

/**
 * TODO 2 — Les catégories : `useQuery` sur `productKeys.categories()` avec `fetchCategories`,
 * `staleTime: Infinity` (elles ne changent pas). Renvoyez `{ categories }` (un computed, [] tant
 * que la réponse n'est pas là).
 */
export function useCategories(): { categories: ComputedRef<Category[]> } {
  throw new Error('À écrire')
}
