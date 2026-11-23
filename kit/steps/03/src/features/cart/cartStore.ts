/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CartItem, CartProduct } from './types'

export const CART_STORAGE_KEY = 'shop.cart'

/**
 * TODO 1 — Relit le panier sauvegardé (clé CART_STORAGE_KEY).
 * Un contenu absent, un JSON illisible, ce qui n'est pas un tableau ou des lignes mal formées
 * (id/price/quantity non numériques, quantité <= 0...) donnent un panier vide ou filtré : JAMAIS d'exception.
 */
export function loadCart(storage: Storage = localStorage): CartItem[] {
  throw new Error('À écrire')
}

/** TODO 2 — Écrit le panier en JSON ; un stockage indisponible ou plein ne doit pas casser l'application. */
export function saveCart(items: CartItem[], storage: Storage = localStorage): void {
  throw new Error('À écrire')
}

/**
 * TODO 3 — Le panier : un store Pinia « setup » (ref = state, computed = getters, fonctions = actions).
 * Remplacez les corps ci-dessous. Partez de `loadCart()` pour `items`, et ajoutez un `watch(items, ...,
 * { deep: true })` qui appelle `saveCart` : c'est la persistance.
 */
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalItems = computed<number>(() => 0)
  const totalPrice = computed<number>(() => 0)

  function add(product: CartProduct, quantity = 1): void {
    throw new Error('À écrire')
  }

  function remove(id: number): void {
    throw new Error('À écrire')
  }

  /** Une quantité <= 0 supprime la ligne. */
  function setQuantity(id: number, quantity: number): void {
    throw new Error('À écrire')
  }

  function clear(): void {
    throw new Error('À écrire')
  }

  return { items, totalItems, totalPrice, add, remove, setQuantity, clear }
})
