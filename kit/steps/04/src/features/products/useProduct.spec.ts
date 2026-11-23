import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { requestLog, useMockServer } from '@/test/msw/server'
import { withSetup } from '@/test/with-setup'
import { usePrefetchProduct, useProduct } from './useProduct'

useMockServer()

describe('useProduct', () => {
  it('charge la fiche d’un produit', async () => {
    const { result, unmount } = withSetup(() => useProduct(7))
    expect(result.isPending.value).toBe(true)
    await vi.waitFor(() => expect(result.data.value?.id).toBe(7))
    expect(requestLog).toEqual(['GET /products/7'])
    unmount()
  })

  it('suit un id réactif : changer d’id charge l’autre fiche', async () => {
    const id = ref(1)
    const { result, unmount } = withSetup(() => useProduct(id))
    await vi.waitFor(() => expect(result.data.value?.id).toBe(1))
    id.value = 2
    await vi.waitFor(() => expect(result.data.value?.id).toBe(2))
    expect(requestLog).toEqual(['GET /products/1', 'GET /products/2'])
    unmount()
  })

  it('un produit inconnu donne une erreur (404)', async () => {
    const { result, unmount } = withSetup(() => useProduct(999))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(result.error.value?.message).toContain('404')
    unmount()
  })
})

describe('usePrefetchProduct', () => {
  it('précharge la fiche : useProduct la trouve déjà en cache, sans nouvel appel', async () => {
    const hover = withSetup(() => usePrefetchProduct())
    await hover.result(5) // survol de la carte
    expect(requestLog).toEqual(['GET /products/5'])

    const page = withSetup(() => useProduct(5), { queryClient: hover.queryClient })
    expect(page.result.isPending.value).toBe(false) // pas de spinner
    expect(page.result.data.value?.id).toBe(5)
    expect(requestLog).toHaveLength(1)
    hover.unmount()
    page.unmount()
  })

  it('ne refait pas d’appel tant que la fiche préchargée est fraîche', async () => {
    const { result: prefetch, unmount } = withSetup(() => usePrefetchProduct())
    await prefetch(5)
    await prefetch(5)
    await prefetch(5)
    expect(requestLog).toEqual(['GET /products/5'])
    unmount()
  })
})
