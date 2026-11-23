/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { UseMutationReturnType } from '@tanstack/vue-query'
import type { CartAddResponse } from '@/features/products/schemas'
import type { CartProduct } from './types'

export interface AddToCartInput {
  product: CartProduct
  quantity?: number
}

/**
 * TODO — Ajout au panier OPTIMISTE avec `useMutation`.
 * DummyJSON ne persiste rien (POST /carts/add est simulé) : le panier local (store Pinia) fait foi.
 *  - `mutationFn` : `postCartAdd(product.id, quantity)` (quantité 1 par défaut) ;
 *  - `onMutate` : ajoutez tout de suite au store (`cart.add(product, quantity)`) ;
 *  - `onError` : annulez NOTRE ajout (`cart.setQuantity(id, quantité actuelle - quantity)`).
 *    Pensez à deux ajouts simultanés dont un seul échoue : restaurer un instantané complet du panier
 *    ferait perdre l'autre ajout.
 */
export function useAddToCart(): UseMutationReturnType<
  CartAddResponse,
  Error,
  AddToCartInput,
  unknown
> {
  throw new Error('À écrire')
}
