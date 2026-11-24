import { describe, it } from 'vitest'
// À écrire : tests de la page panier avec `createTestingPinia` (via `mountWithApp`, que vous avez écrit).
//
// Outils : `mountWithApp(CartPage, { initialState: { cart: { items: [...] } } })` de '@/test/mount-component' :
// le store `cart` est rempli par `initialState`, ses actions sont des ESPIONS (`expect(cart.remove).toHaveBeenCalledWith(2)`).
// `useCartStore(pinia)` donne le store ; un élément du panier a `{ id, title, price, thumbnail, quantity }`.
// Sélecteurs : voir la zone `cart` d'AGENTS.md. N'oubliez pas `unmount()` (dans `afterEach`).
describe('CartPage', () => {
  it.todo('panier vide : message et lien vers le catalogue, pas de total')
  it.todo('affiche une ligne par produit avec sa quantité')
  it.todo('affiche le total')
  it.todo('« + » demande une unité de plus au store (setQuantity)')
  it.todo('« − » demande une unité de moins au store')
  it.todo('la corbeille retire LA ligne cliquée, pas une autre (remove)')
  it.todo('« Vider le panier » appelle clear()')
})
