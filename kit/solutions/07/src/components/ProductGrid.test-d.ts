// Test de TYPES : Vitest le passe à vue-tsc (voir `typecheck` dans vite.config.ts). Il ne s'exécute pas,
// il doit COMPILER : si ProductGrid n'est pas générique, ou si ses slots ne sont pas typés, il échoue.
import { describe, expectTypeOf, it } from 'vitest'
import type { Product } from '@/features/products/types'
import ProductGrid from './ProductGrid.vue'

// Un composant générique est, pour vue-tsc, une FONCTION générique : on fixe `T` avec une
// « instantiation expression » (`typeof ProductGrid<Product>`) et on lit son contexte (`__ctx`).
type Ctx<T extends { id: number }> = NonNullable<ReturnType<typeof ProductGrid<T>>['__ctx']>

describe('ProductGrid<T>', () => {
  it('items est un tableau de T', () => {
    expectTypeOf<Ctx<Product>['props']['items']>().toEqualTypeOf<readonly Product[]>()
  })

  it('le slot « item » reçoit { item: T, index: number }', () => {
    type ItemSlot = NonNullable<Ctx<Product>['slots']['item']>
    expectTypeOf<Parameters<ItemSlot>[0]>().toEqualTypeOf<{ item: Product; index: number }>()
  })

  it('le slot « header » reçoit le nombre d’éléments', () => {
    type HeaderSlot = NonNullable<Ctx<Product>['slots']['header']>
    expectTypeOf<Parameters<HeaderSlot>[0]>().toEqualTypeOf<{ count: number }>()
  })

  it('refuse un type sans `id` numérique', () => {
    expectTypeOf<Ctx<{ id: number; label: string }>['props']['items']>().not.toBeAny()
    // @ts-expect-error `{ name: string }` n'a pas d'`id` : T ne respecte pas la contrainte
    type Bad = Ctx<{ name: string }>
    // @ts-expect-error `id` doit être un nombre
    type AlsoBad = Ctx<{ id: string }>
    expectTypeOf<Bad | AlsoBad>().not.toBeNever()
  })
})
