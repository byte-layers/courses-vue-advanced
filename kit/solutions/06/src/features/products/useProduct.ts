import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/vue-query'
import { fetchProduct } from '@/api/products'
import { productKeys } from './queryKeys'

/** Un seul endroit décrit « le détail d'un produit » : useProduct et le prefetch le partagent. */
export function productDetailOptions(id: number) {
  return queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    staleTime: 60_000,
  })
}

/** Le détail d'un produit ; `id` peut être un ref (navigation d'une fiche à l'autre). */
export function useProduct(id: MaybeRefOrGetter<number>) {
  return useQuery(computed(() => productDetailOptions(toValue(id))))
}

/**
 * Renvoie une fonction `prefetch(id)` à appeler au survol : la fiche est déjà en cache
 * quand l'utilisateur clique, et rien n'est refait si elle est encore fraîche.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient()
  return (id: number) => queryClient.prefetchQuery(productDetailOptions(id))
}
