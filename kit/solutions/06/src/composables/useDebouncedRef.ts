import { customRef, getCurrentScope, onScopeDispose, type Ref } from 'vue'

/**
 * Un ref dont l'écriture est « posée » après `delay` ms de silence.
 * La lecture renvoie la dernière valeur posée, pas la dernière écrite.
 */
export function useDebouncedRef<T>(initial: T, delay = 300): Ref<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  // Dans un composant ou un effectScope : pas de minuteur qui survit à la destruction.
  if (getCurrentScope()) onScopeDispose(cancel)

  return customRef<T>((track, trigger) => {
    let value = initial
    return {
      get() {
        track()
        return value
      },
      set(next) {
        cancel() // une nouvelle saisie annule la précédente
        timer = setTimeout(() => {
          timer = undefined
          value = next
          trigger() // c'est nous qui décidons quand les lecteurs sont prévenus
        }, delay)
      },
    }
  })
}
