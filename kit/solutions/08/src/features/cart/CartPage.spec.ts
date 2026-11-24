import { afterEach, describe, expect, it } from 'vitest'
import { mountWithApp } from '@/test/mount-component'
import { useCartStore } from './cartStore'
import CartPage from './pages/CartPage.vue'

// createTestingPinia (dans mountWithApp) : les stores sont remplis par `initialState`, leurs actions sont des espions.
const mug = { id: 1, title: 'Mug', price: 12.5, thumbnail: 'mug.png', quantity: 2 }
const lamp = { id: 2, title: 'Lampe', price: 30, thumbnail: 'lamp.png', quantity: 1 }

let cleanup: (() => void) | undefined
afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

async function mountCart(items: unknown[]) {
  const mounted = await mountWithApp(CartPage, { initialState: { cart: { items } } })
  cleanup = mounted.unmount
  return { ...mounted, cart: useCartStore(mounted.pinia) }
}

const rows = (wrapper: Awaited<ReturnType<typeof mountCart>>['wrapper']) =>
  wrapper.findAll('[data-testid="cart-item"]')

describe('CartPage', () => {
  it('panier vide : message et lien vers le catalogue, pas de total', async () => {
    const { wrapper } = await mountCart([])
    expect(wrapper.find('[data-testid="cart-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cart-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cart-empty"] a').attributes('href')).toBe('/products')
  })

  it('affiche une ligne par produit avec sa quantité', async () => {
    const { wrapper } = await mountCart([mug, lamp])
    expect(rows(wrapper)).toHaveLength(2)
    expect(rows(wrapper)[0]!.text()).toContain('Mug')
    expect(rows(wrapper)[0]!.find('[data-testid="cart-item-qty"]').text()).toBe('2')
  })

  it('affiche le total (2 × 12,50 € + 30 €)', async () => {
    const { wrapper } = await mountCart([mug, lamp])
    expect(wrapper.get('[data-testid="cart-total"]').text()).toMatch(/55,00/)
  })

  it('« + » demande une unité de plus au store', async () => {
    const { wrapper, cart } = await mountCart([mug])
    await rows(wrapper)[0]!.get('[data-testid="cart-item-increase"]').trigger('click')
    expect(cart.setQuantity).toHaveBeenCalledWith(1, 3)
  })

  it('« − » demande une unité de moins au store', async () => {
    const { wrapper, cart } = await mountCart([mug])
    await rows(wrapper)[0]!.get('[data-testid="cart-item-decrease"]').trigger('click')
    expect(cart.setQuantity).toHaveBeenCalledWith(1, 1)
  })

  it('la corbeille retire LA ligne cliquée, pas une autre', async () => {
    const { wrapper, cart } = await mountCart([mug, lamp])
    await rows(wrapper)[1]!.get('[data-testid="cart-item-remove"]').trigger('click')
    expect(cart.remove).toHaveBeenCalledTimes(1)
    expect(cart.remove).toHaveBeenCalledWith(2)
  })

  it('« Vider le panier » appelle clear()', async () => {
    const { wrapper, cart } = await mountCart([mug])
    await wrapper.get('[data-testid="cart-clear"]').trigger('click')
    expect(cart.clear).toHaveBeenCalledTimes(1)
  })

  it('« Passer commande » mène à /checkout', async () => {
    const { wrapper } = await mountCart([mug])
    expect(wrapper.get('[data-testid="cart-checkout"]').attributes('href')).toBe('/checkout')
  })
})
