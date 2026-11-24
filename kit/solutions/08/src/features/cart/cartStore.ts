import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CartItem, CartProduct } from './types'

export const CART_STORAGE_KEY = 'shop.cart'

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.price === 'number' &&
    typeof item.thumbnail === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  )
}

/** Relit le panier sauvegardé. Un contenu absent, illisible ou mal formé donne un panier vide. */
export function loadCart(storage: Storage = localStorage): CartItem[] {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return [] // JSON corrompu, stockage indisponible : on repart d'un panier vide
  }
}

export function saveCart(items: CartItem[], storage: Storage = localStorage) {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // quota dépassé ou stockage bloqué : le panier reste en mémoire
  }
}

/** Le panier : un store Pinia « setup » (ref = state, computed = getters, fonctions = actions). */
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(loadCart())

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  function add(product: CartProduct, quantity = 1) {
    const existing = items.value.find((item) => item.id === product.id)
    if (existing) existing.quantity += quantity
    else items.value.push({ ...product, quantity })
  }

  function remove(id: number) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function setQuantity(id: number, quantity: number) {
    if (quantity <= 0) return remove(id)
    const existing = items.value.find((item) => item.id === id)
    if (existing) existing.quantity = quantity
  }

  function clear() {
    items.value = []
  }

  // Persistance : à chaque changement (profond), on réécrit le stockage.
  watch(items, (value) => saveCart(value), { deep: true })

  return { items, totalItems, totalPrice, add, remove, setQuantity, clear }
})
