import { markRaw, reactive, shallowRef, toRefs, triggerRef, type ShallowRef } from 'vue'

/**
 * Piège du destructuring : `const { count } = state` copie un nombre, la réactivité est perdue.
 * Ce composable renvoie des refs (toRefs) : on peut le destructurer sans rien perdre.
 */
export function useCounterState(initial = 0) {
  const state = reactive({ count: initial, step: 1 })
  function increment() {
    state.count += state.step
  }
  return { ...toRefs(state), increment }
}

/**
 * Une grande liste d'objets qu'on ne veut pas rendre profondément réactive (shallowRef).
 * Seul le remplacement de `.value` notifie ; `refresh()` force la notification après une mutation.
 */
export function useRawList<T extends object>(initial: T[] = []) {
  const list: ShallowRef<T[]> = shallowRef(initial)
  function append(item: T) {
    list.value = [...list.value, item] // on remplace : c'est ce qui déclenche
  }
  function refresh() {
    triggerRef(list)
  }
  return { list, append, refresh }
}

/**
 * Un objet « moteur » (graphique, carte, socket...) rangé dans un état réactif sans être proxifié.
 * markRaw le marque : Vue ne l'enveloppera jamais dans un Proxy.
 */
export function attachEngine<E extends object>(state: { engine: E | null }, engine: E) {
  state.engine = markRaw(engine)
}
