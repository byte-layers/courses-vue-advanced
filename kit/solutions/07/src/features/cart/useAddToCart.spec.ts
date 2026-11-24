import { beforeEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { API_URL } from '@/api/config'
import { server, useMockServer } from '@/test/msw/server'
import { withSetup } from '@/test/with-setup'
import { useAddToCart } from './useAddToCart'
import { useCartStore } from './cartStore'

useMockServer()

const mug = { id: 1, title: 'Mug', price: 10, thumbnail: 'mug.png' }
const lamp = { id: 2, title: 'Lampe', price: 25, thumbnail: 'lamp.png' }

const failWith = (status: number, wait = 0) =>
  http.post(`${API_URL}/carts/add`, async () => {
    await delay(wait)
    return HttpResponse.json({ message: 'refusé' }, { status })
  })

describe('useAddToCart (optimiste)', () => {
  beforeEach(() => localStorage.clear())

  it('met le panier à jour AVANT la réponse du serveur', async () => {
    server.use(
      http.post(`${API_URL}/carts/add`, async () => {
        await delay(80)
        return HttpResponse.json({ id: 51, userId: 1, totalProducts: 1, totalQuantity: 1 })
      }),
    )
    const { result, pinia, unmount } = withSetup(() => useAddToCart())
    const cart = useCartStore(pinia)

    result.mutate({ product: mug })
    await vi.waitFor(() => expect(cart.items).toHaveLength(1)) // visible tout de suite...
    expect(result.isPending.value).toBe(true) // ... alors que le serveur n'a pas encore répondu

    await vi.waitFor(() => expect(result.isSuccess.value).toBe(true))
    expect(cart.items).toEqual([{ ...mug, quantity: 1 }]) // et il reste après la réponse
    unmount()
  })

  it('envoie POST /carts/add avec le produit et la quantité', async () => {
    let body: unknown
    server.use(
      http.post(`${API_URL}/carts/add`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 51, userId: 1, totalProducts: 1, totalQuantity: 2 })
      }),
    )
    const { result, unmount } = withSetup(() => useAddToCart())
    await result.mutateAsync({ product: mug, quantity: 2 })
    expect(body).toEqual({ userId: 1, products: [{ id: 1, quantity: 2 }] })
    unmount()
  })

  it('rollback : si le serveur refuse, la ligne ajoutée disparaît', async () => {
    server.use(failWith(500, 30))
    const { result, pinia, unmount } = withSetup(() => useAddToCart())
    const cart = useCartStore(pinia)

    const attempt = result.mutateAsync({ product: mug }).catch(() => 'refusé')
    await vi.waitFor(() => expect(cart.items).toHaveLength(1)) // optimiste
    expect(await attempt).toBe('refusé')
    expect(cart.items).toEqual([]) // annulé
    unmount()
  })

  it('rollback : une ligne existante retrouve sa quantité d’avant', async () => {
    server.use(failWith(500))
    const { result, pinia, unmount } = withSetup(() => useAddToCart())
    const cart = useCartStore(pinia)
    cart.add(mug, 2)

    await result.mutateAsync({ product: mug, quantity: 3 }).catch(() => undefined)
    expect(cart.items).toEqual([{ ...mug, quantity: 2 }])
    unmount()
  })

  it('rollback : deux ajouts en vol, un seul échoue : l’autre est conservé', async () => {
    server.use(
      http.post(`${API_URL}/carts/add`, async ({ request }) => {
        const body = (await request.json()) as { products: { id: number }[] }
        if (body.products[0]?.id === 1) {
          await delay(60) // le mug échoue, tard
          return HttpResponse.json({ message: 'refusé' }, { status: 500 })
        }
        await delay(10)
        return HttpResponse.json({ id: 51, userId: 1, totalProducts: 1, totalQuantity: 1 })
      }),
    )
    const { result, pinia, unmount } = withSetup(() => useAddToCart())
    const cart = useCartStore(pinia)

    const results = await Promise.allSettled([
      result.mutateAsync({ product: mug }),
      result.mutateAsync({ product: lamp }),
    ])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled'])
    expect(cart.items).toEqual([{ ...lamp, quantity: 1 }]) // la lampe survit au rollback du mug
    unmount()
  })
})
