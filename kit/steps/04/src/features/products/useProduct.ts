/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { MaybeRefOrGetter } from 'vue'
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { Product } from './types'

/**
 * TODO 1 — Un seul endroit décrit « le détail d'un produit » : `useProduct` et le prefetch le partagent.
 * Utilisez `queryOptions({ queryKey: productKeys.detail(id), queryFn: ({ signal }) => fetchProduct(id, signal),
 * staleTime: 60_000 })` et renvoyez-le.
 */
export function productDetailOptions(id: number) {
  throw new Error('À écrire')
}

/**
 * TODO 2 — Le détail d'un produit ; `id` peut être un ref ou un getter (navigation d'une fiche à l'autre).
 * Indice : `useQuery(computed(() => productDetailOptions(toValue(id))))`.
 */
export function useProduct(id: MaybeRefOrGetter<number>): UseQueryReturnType<Product, Error> {
  throw new Error('À écrire')
}

/**
 * TODO 3 — Renvoie une fonction `prefetch(id)` à appeler au survol : `queryClient.prefetchQuery(options)`
 * (`useQueryClient()`). La fiche est déjà en cache au clic, et rien n'est refait tant qu'elle est fraîche.
 */
export function usePrefetchProduct(): (id: number) => Promise<void> {
  throw new Error('À écrire')
}
