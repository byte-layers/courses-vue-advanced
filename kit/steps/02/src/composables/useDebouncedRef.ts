import type { Ref } from 'vue'

/**
 * Un ref dont l'écriture est « posée » après `delay` ms de silence.
 * La lecture renvoie la dernière valeur posée, pas la dernière écrite.
 *
 * TODO — Utilisez `customRef` :
 *  - get : track() puis la valeur posée ;
 *  - set : annule le minuteur en cours, en arme un nouveau qui pose la valeur puis appelle trigger() ;
 *  - si on est dans un scope (`getCurrentScope()`), annulez le minuteur à sa destruction (`onScopeDispose`).
 */
export function useDebouncedRef<T>(initial: T, delay = 300): Ref<T> {
  throw new Error('À écrire')
}
