import { describe, expect, it } from 'vitest'
import { useCart } from './useCart'

const mug = { id: 1, title: 'Mug', price: 10, thumbnail: '' }

describe('useCart (panier Provide/Inject)', () => {
  it('ajoute un produit puis incrémente sa quantité', () => {
    const cart = useCart()
    cart.addToCart(mug)
    cart.addToCart(mug)
    expect(cart.state.items).toHaveLength(1)
    expect(cart.totalItems.value).toBe(2)
    expect(cart.totalPrice.value).toBe(20)
  })

  it('retire une ligne et vide le panier', () => {
    const cart = useCart()
    cart.addToCart(mug)
    cart.addToCart({ ...mug, id: 2 })
    cart.removeFromCart(1)
    expect(cart.state.items.map((i) => i.id)).toEqual([2])
    cart.clearCart()
    expect(cart.totalItems.value).toBe(0)
  })
})
