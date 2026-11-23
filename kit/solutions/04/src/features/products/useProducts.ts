import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { fetchCategories, fetchProducts } from '@/api/products'
import { productKeys } from './queryKeys'
import type { Category, Product } from './types'

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

/** Le catalogue paginé. Les paramètres sont réactifs : changer la page ou la recherche change la clé. */
export function useProducts(params: ProductsParams): UseProductsResult {
  const pageSize = params.pageSize ?? 12

  // La clé contient tout ce dont dépend le résultat : TanStack Query refait l'appel quand elle change.
  const key = computed(() =>
    productKeys.list({
      page: toValue(params.page),
      pageSize,
      search: toValue(params.search) ?? '',
      category: toValue(params.category) ?? null,
    }),
  )

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => {
      const { page, search, category } = key.value[2]
      return fetchProducts(
        { limit: pageSize, skip: (page - 1) * pageSize, q: search, category },
        signal,
      )
    },
    placeholderData: keepPreviousData, // pendant le chargement de la page suivante, on garde l'ancienne
    staleTime: 30_000,
  })

  const products = computed(() => query.data.value?.products ?? [])
  const total = computed(() => query.data.value?.total ?? 0)
  return {
    products,
    total,
    pageCount: computed(() => Math.ceil(total.value / pageSize)),
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    isEmpty: computed(() => query.isSuccess.value && products.value.length === 0),
    refetch: query.refetch,
  }
}

/** Les catégories changent rarement : mises en cache sans péremption. */
export function useCategories() {
  const query = useQuery<Category[]>({
    queryKey: productKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: Infinity,
  })
  return { categories: computed(() => query.data.value ?? []), ...query }
}
