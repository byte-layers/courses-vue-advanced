import { computed, inject, reactive } from 'vue'

export interface CartItem {
  id: number
  title: string
  price: number
  thumbnail: string
  quantity: number
}

export type CartProduct = Omit<CartItem, 'quantity'>

/** Clé d'injection : une simple chaîne pour l'instant (l'étape 03 la type). */
export const CART_KEY = 'cart'

/** La fabrique du panier : chaque appel crée un état neuf. */
export function useCart() {
  const state = reactive({ items: [] as CartItem[] })

  function addToCart(product: CartProduct) {
    const existing = state.items.find((item) => item.id === product.id)
    if (existing) existing.quantity++
    else state.items.push({ ...product, quantity: 1 })
  }

  function setQuantity(id: number, quantity: number) {
    if (quantity <= 0) return removeFromCart(id)
    const existing = state.items.find((item) => item.id === id)
    if (existing) existing.quantity = quantity
  }

  function removeFromCart(id: number) {
    state.items = state.items.filter((item) => item.id !== id)
  }

  function clearCart() {
    state.items = []
  }

  const totalItems = computed(() => state.items.reduce((sum, item) => sum + item.quantity, 0))
  const totalPrice = computed(() =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  return { state, addToCart, setQuantity, removeFromCart, clearCart, totalItems, totalPrice }
}

export type Cart = ReturnType<typeof useCart>

/** Récupère le panier fourni par CartProvider, ou échoue clairement. */
export function useInjectedCart(): Cart {
  const cart = inject<Cart>(CART_KEY)
  if (!cart) throw new Error('Cart is not provided! Wrap the app in <CartProvider>.')
  return cart
}
