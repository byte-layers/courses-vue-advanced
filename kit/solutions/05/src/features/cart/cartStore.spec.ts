import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { CART_STORAGE_KEY, loadCart, useCartStore } from './cartStore'

const mug = { id: 1, title: 'Mug', price: 10, thumbnail: 'mug.png' }
const lamp = { id: 2, title: 'Lampe', price: 25.5, thumbnail: 'lamp.png' }

/** Simule un rechargement de la page : nouveau Pinia, nouveau store, même localStorage. */
function reloadStore() {
  setActivePinia(createPinia())
  return useCartStore()
}

describe('store panier', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('ajoute un produit avec une quantité de 1', () => {
    const cart = useCartStore()
    cart.add(mug)
    expect(cart.items).toEqual([{ ...mug, quantity: 1 }])
  })

  it('incrémente la quantité quand le produit est déjà dans le panier', () => {
    const cart = useCartStore()
    cart.add(mug)
    cart.add(mug)
    cart.add(mug, 3)
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.quantity).toBe(5)
  })

  it('modifie la quantité, et supprime la ligne à 0', () => {
    const cart = useCartStore()
    cart.add(mug)
    cart.setQuantity(1, 4)
    expect(cart.items[0]?.quantity).toBe(4)
    cart.setQuantity(1, 0)
    expect(cart.items).toEqual([])
  })

  it('retire une ligne et vide le panier', () => {
    const cart = useCartStore()
    cart.add(mug)
    cart.add(lamp)
    cart.remove(1)
    expect(cart.items.map((i) => i.id)).toEqual([2])
    cart.clear()
    expect(cart.items).toEqual([])
  })

  it('calcule le nombre d’articles et le total', () => {
    const cart = useCartStore()
    cart.add(mug, 2)
    cart.add(lamp)
    expect(cart.totalItems).toBe(3)
    expect(cart.totalPrice).toBeCloseTo(45.5)
  })

  it('persiste le panier dans localStorage à chaque changement', async () => {
    const cart = useCartStore()
    cart.add(mug)
    cart.setQuantity(1, 3) // mutation profonde : le watch doit la voir
    await nextTick()
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? 'null')
    expect(saved).toEqual([{ ...mug, quantity: 3 }])
  })

  it('retrouve le panier après un rechargement', async () => {
    useCartStore().add(lamp, 2)
    await nextTick()
    const reloaded = reloadStore()
    expect(reloaded.items).toEqual([{ ...lamp, quantity: 2 }])
    expect(reloaded.totalItems).toBe(2)
  })

  it('résiste à un JSON corrompu : panier vide, pas d’exception', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{pas du json')
    expect(loadCart()).toEqual([])
    expect(reloadStore().items).toEqual([])
  })

  it('ignore les lignes mal formées d’un contenu sauvegardé', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ ...mug, quantity: 2 }, { id: 'x' }, null, { ...lamp, quantity: -1 }]),
    )
    expect(loadCart()).toEqual([{ ...mug, quantity: 2 }])
  })

  it('ignore un contenu sauvegardé qui n’est pas un tableau', () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [] }))
    expect(loadCart()).toEqual([])
  })
})
