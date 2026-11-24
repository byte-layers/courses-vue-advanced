import { describe, it } from 'vitest'
// À écrire : tests de `useBidRules` (src/features/auctions/useBidRules.ts), un composable testé avec `withSetup`.
//
// Outils : `withSetup(() => useBidRules(auction))` de '@/test/with-setup' (rend `{ result, unmount }` ; appelez
// `unmount()` en fin de test) ; `makeAuction()` de '@/test/auction-fixtures' ; `ref` et `nextTick` de 'vue'.
//
// Remplacez chaque `it.todo` par un vrai test (`it('...', () => { ... })`). `node mutate.mjs` refuse les `it.todo`
// et vérifie que vos tests échouent quand on casse le code : écrivez des assertions précises.
describe('useBidRules', () => {
  it.todo('l’offre minimale est le prix courant plus un pas')
  it.todo('le minimum suit le prix quand il change (réactif : changez l’enchère, attendez nextTick)')
  it.todo('arrondit à deux décimales')
  it.todo('accepte le minimum exact et tout montant au-dessus')
  it.todo('refuse un montant sous le minimum, avec le minimum dans le message')
  it.todo('refuse un montant qui n’est pas un nombre')
  it.todo('enchère terminée : aucune offre n’est acceptable')
  it.todo('enchère absente : message dédié')
})
