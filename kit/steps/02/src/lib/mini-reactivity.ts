/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */

// Mini-réactivité : le cœur de ref / computed / watchEffect en une soixantaine de lignes.
// Principe : un effet qui lit une donnée s'inscrit chez elle (track) ; quand la donnée
// change, elle relance les effets inscrits (trigger).
//
// Lancez `npm test -- mini-reactivity` : tout est rouge. À vous de le rendre vert.

export interface MiniRef<T> {
  value: T
}

export interface MiniComputed<T> {
  readonly value: T
}

interface Effect {
  /** Exécute la fonction en s'inscrivant comme effet actif. */
  run(): unknown
  /** Si présent, appelé à la place de run() quand une dépendance change. */
  scheduler?: () => void
  /** Ensembles de dépendances qui contiennent cet effet (pour se désinscrire). */
  deps: Set<Effect>[]
  active: boolean
}

/** L'effet en cours d'exécution : c'est lui que `track` inscrit. */
let activeEffect: Effect | undefined

/** cible -> clé -> effets abonnés. */
const targetMap = new WeakMap<object, Map<PropertyKey, Set<Effect>>>()

/**
 * TODO 1 — Retire l'effet de toutes ses dépendances (`effect.deps`), puis vide `effect.deps`.
 * Pourquoi : à chaque exécution l'effet relit ses données, ses dépendances peuvent changer.
 */
function cleanup(effect: Effect) {
  throw new Error('À écrire')
}

/**
 * TODO 2 — Crée un effet. `run()` doit : nettoyer, se déclarer `activeEffect`
 * (en mémorisant l'effet précédent pour le restaurer : les effets s'imbriquent),
 * exécuter `fn`, puis restaurer `activeEffect` (même si `fn` jette).
 */
function createEffect(fn: () => unknown, scheduler?: () => void): Effect {
  throw new Error('À écrire')
}

/** TODO 3 — Inscrit `activeEffect` dans l'ensemble de (target, key) ; sans effet actif, ne fait rien. */
function track(target: object, key: PropertyKey) {
  throw new Error('À écrire')
}

/**
 * TODO 4 — Relance les effets inscrits à (target, key), via leur `scheduler` s'ils en ont un,
 * sinon `run()`. Attention : itérer sur une COPIE, et ignorer `activeEffect` (pas de boucle).
 */
function trigger(target: object, key: PropertyKey) {
  throw new Error('À écrire')
}

/** TODO 5 — Une valeur réactive avec accesseurs `get value` / `set value` (track / trigger). */
export function miniRef<T>(initial: T): MiniRef<T> {
  throw new Error('À écrire')
}

/**
 * TODO 6 — Une valeur calculée : paresseuse (le getter n'est appelé qu'à la première lecture)
 * et mise en cache (recalcul seulement après un changement de source).
 * Indice : un effet avec `scheduler` qui marque « sale » et prévient les lecteurs.
 */
export function miniComputed<T>(getter: () => T): MiniComputed<T> {
  throw new Error('À écrire')
}

/** TODO 7 — Exécute `effect` tout de suite, le relance à chaque changement. Retourne `stop`. */
export function miniWatchEffect(effect: () => void): () => void {
  throw new Error('À écrire')
}

/** TODO 8 (bonus, Proxy) — Un objet réactif profond : `get` appelle track, `set` appelle trigger. */
export function miniReactive<T extends object>(target: T): T {
  throw new Error('À écrire')
}
