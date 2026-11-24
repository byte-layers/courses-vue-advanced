import { useMutation } from '@tanstack/vue-query'
import { postCartAdd } from '@/api/products'
import { useCartStore } from './cartStore'
import type { CartProduct } from './types'

export interface AddToCartInput {
  product: CartProduct
  quantity?: number
}

/**
 * Ajout au panier OPTIMISTE : le panier local est mis à jour tout de suite, la requête part ensuite.
 * DummyJSON ne persiste rien (POST /carts/add est simulé) : le panier local fait foi, la requête
 * ne sert qu'à illustrer la mutation et son rollback si le serveur répond une erreur.
 */
export function useAddToCart() {
  const cart = useCartStore()

  return useMutation({
    mutationFn: ({ product, quantity = 1 }: AddToCartInput) => postCartAdd(product.id, quantity),

    onMutate: ({ product, quantity = 1 }) => {
      cart.add(product, quantity) // l'interface réagit immédiatement
    },

    // Échec : on ANNULE seulement notre ajout (pas de restauration d'un instantané complet :
    // un autre ajout optimiste, encore en vol, serait perdu avec lui).
    onError: (_error, { product, quantity = 1 }) => {
      const line = cart.items.find((item) => item.id === product.id)
      cart.setQuantity(product.id, (line?.quantity ?? 0) - quantity)
    },
  })
}
