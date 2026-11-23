import type { Ref, ShallowRef } from 'vue'

/**
 * TODO 1 — Piège du destructuring : `const { count } = state` copie un nombre, la réactivité est perdue.
 * Créez un `reactive({ count: initial, step: 1 })` et renvoyez `{ ...toRefs(state), increment }`,
 * où `increment()` fait `state.count += state.step`.
 */
export function useCounterState(initial = 0): {
  count: Ref<number>
  step: Ref<number>
  increment: () => void
} {
  throw new Error('À écrire')
}

/**
 * TODO 2 — Une grande liste d'objets qu'on ne veut pas rendre profondément réactive.
 * Utilisez `shallowRef`. `append(item)` REMPLACE le tableau (c'est ce qui notifie) ;
 * `refresh()` force la notification après une mutation en place (`triggerRef`).
 */
export function useRawList<T extends object>(
  initial: T[] = [],
): { list: ShallowRef<T[]>; append: (item: T) => void; refresh: () => void } {
  throw new Error('À écrire')
}

/**
 * TODO 3 — Rangez le moteur dans l'état réactif SANS qu'il soit proxifié : `markRaw`.
 */
export function attachEngine<E extends object>(state: { engine: E | null }, engine: E): void {
  throw new Error('À écrire')
}
