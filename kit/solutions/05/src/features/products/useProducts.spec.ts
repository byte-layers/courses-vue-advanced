import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { delay, http, HttpResponse } from 'msw'
import { API_URL } from '@/api/config'
import { catalog } from '@/test/fixtures'
import { paginate } from '@/test/msw/handlers'
import { requestLog, server, useMockServer } from '@/test/msw/server'
import { withSetup } from '@/test/with-setup'
import { productKeys } from './queryKeys'
import { useCategories, useProducts } from './useProducts'

useMockServer()

describe('useProducts', () => {
  it('charge la première page : 12 produits, total et nombre de pages', async () => {
    const { result, unmount } = withSetup(() => useProducts({ page: ref(1) }))
    expect(result.isPending.value).toBe(true)
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    expect(result.products.value).toHaveLength(12)
    expect(result.total.value).toBe(30)
    expect(result.pageCount.value).toBe(3)
    expect(requestLog).toEqual(['GET /products?limit=12&skip=0'])
    unmount()
  })

  it('change de page : skip suit la page, et l’ancienne page reste affichée pendant le chargement', async () => {
    server.use(
      http.get(`${API_URL}/products`, async ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('skip') === '12') await delay(50)
        return HttpResponse.json(paginate(catalog, url))
      }),
    )
    const page = ref(1)
    const { result, unmount } = withSetup(() => useProducts({ page }))
    await vi.waitFor(() => expect(result.products.value).toHaveLength(12))

    page.value = 2
    await nextTick()
    expect(result.isFetching.value).toBe(true)
    expect(result.products.value[0]?.id).toBe(1) // placeholderData : pas de page blanche

    await vi.waitFor(() => expect(result.products.value[0]?.id).toBe(13))
    expect(requestLog).toContain('GET /products?limit=12&skip=12')
    unmount()
  })

  it('recherche : appelle /products/search?q=', async () => {
    const search = ref('Produit 1')
    const { result, unmount } = withSetup(() => useProducts({ page: ref(1), search }))
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    expect(requestLog).toEqual(['GET /products/search?q=Produit%201&limit=12&skip=0'])
    expect(result.products.value.every((p) => p.title.includes('Produit 1'))).toBe(true)
    unmount()
  })

  it('catégorie : appelle /products/category/<slug>', async () => {
    const { result, unmount } = withSetup(() =>
      useProducts({ page: ref(1), category: ref('beauty') }),
    )
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    expect(requestLog).toEqual(['GET /products/category/beauty?limit=12&skip=0'])
    expect(result.products.value.every((p) => p.category === 'beauty')).toBe(true)
    unmount()
  })

  it('accepte une fonction getter comme paramètre réactif', async () => {
    const state = ref(1)
    const { result, unmount } = withSetup(() => useProducts({ page: () => state.value }))
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    state.value = 3
    await vi.waitFor(() => expect(result.products.value[0]?.id).toBe(25))
    unmount()
  })

  it('état vide : isEmpty quand la recherche ne trouve rien (et pas d’erreur)', async () => {
    const { result, unmount } = withSetup(() =>
      useProducts({ page: ref(1), search: ref('introuvable') }),
    )
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    expect(result.isEmpty.value).toBe(true)
    expect(result.isError.value).toBe(false)
    expect(result.products.value).toEqual([])
    unmount()
  })

  it('état d’erreur : un 500 donne isError, une erreur lisible, et pas de « vide »', async () => {
    server.use(
      http.get(`${API_URL}/products`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    const { result, unmount } = withSetup(() => useProducts({ page: ref(1) }))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(result.error.value?.message).toContain('500')
    expect(result.isEmpty.value).toBe(false)
    unmount()
  })

  it('valide la réponse : un produit mal formé devient une erreur, pas une donnée corrompue', async () => {
    server.use(
      http.get(`${API_URL}/products`, () =>
        HttpResponse.json({ products: [{ id: 'un', title: 3 }], total: 1, skip: 0, limit: 12 }),
      ),
    )
    const { result, unmount } = withSetup(() => useProducts({ page: ref(1) }))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(result.products.value).toEqual([])
    unmount()
  })

  it('met en cache : une seconde lecture de la même page ne refait pas d’appel', async () => {
    const first = withSetup(() => useProducts({ page: ref(1) }))
    await vi.waitFor(() => expect(first.result.isPending.value).toBe(false))
    const second = withSetup(() => useProducts({ page: ref(1) }), {
      queryClient: first.queryClient,
    })
    expect(second.result.isPending.value).toBe(false) // déjà là, sans attendre
    expect(second.result.products.value).toHaveLength(12)
    expect(requestLog).toHaveLength(1)
    first.unmount()
    second.unmount()
  })

  it('invalidation : invalidateQueries relance la requête de la liste affichée', async () => {
    const { result, queryClient, unmount } = withSetup(() => useProducts({ page: ref(1) }))
    await vi.waitFor(() => expect(result.isPending.value).toBe(false))
    expect(requestLog).toHaveLength(1)
    await queryClient.invalidateQueries({ queryKey: productKeys.all })
    expect(requestLog).toHaveLength(2)
    unmount()
  })
})

describe('useCategories', () => {
  it('charge les catégories', async () => {
    const { result, unmount } = withSetup(() => useCategories())
    await vi.waitFor(() => expect(result.categories.value).toHaveLength(2))
    expect(result.categories.value[0]).toMatchObject({ slug: 'beauty', name: 'Beauty' })
    unmount()
  })
})
