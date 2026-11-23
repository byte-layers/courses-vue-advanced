// Mini-réactivité : le cœur de ref / computed / watchEffect en une soixantaine de lignes.
// Principe : un effet qui lit une donnée s'inscrit chez elle (track) ; quand la donnée
// change, elle relance les effets inscrits (trigger).

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

/** Retire l'effet de toutes ses dépendances : elles seront relues à la prochaine exécution. */
function cleanup(effect: Effect) {
  for (const dep of effect.deps) dep.delete(effect)
  effect.deps.length = 0
}

function createEffect(fn: () => unknown, scheduler?: () => void): Effect {
  const effect: Effect = {
    deps: [],
    active: true,
    scheduler,
    run() {
      if (!effect.active) return fn()
      cleanup(effect) // dépendances dynamiques : on repart de zéro à chaque exécution
      const previous = activeEffect
      activeEffect = effect
      try {
        return fn()
      } finally {
        activeEffect = previous // les effets peuvent s'imbriquer
      }
    },
  }
  return effect
}

/** Appelé à chaque lecture : inscrit l'effet actif auprès de (cible, clé). */
function track(target: object, key: PropertyKey) {
  if (!activeEffect) return
  let keyMap = targetMap.get(target)
  if (!keyMap) targetMap.set(target, (keyMap = new Map()))
  let dep = keyMap.get(key)
  if (!dep) keyMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

/** Appelé à chaque écriture : relance les effets abonnés à (cible, clé). */
function trigger(target: object, key: PropertyKey) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // Copie : run() modifie `dep` (cleanup puis nouvelle inscription) pendant la boucle.
  for (const effect of [...dep]) {
    if (effect === activeEffect) continue // un effet qui s'écrit à lui-même ne doit pas boucler
    if (effect.scheduler) effect.scheduler()
    else effect.run()
  }
}

/** Une valeur réactive, avec accesseurs (comme `ref`). */
export function miniRef<T>(initial: T): MiniRef<T> {
  let current = initial
  const ref = {
    get value() {
      track(ref, 'value')
      return current
    },
    set value(next: T) {
      if (Object.is(next, current)) return
      current = next
      trigger(ref, 'value')
    },
  }
  return ref
}

/** Une valeur calculée : paresseuse (calculée à la première lecture) et mise en cache. */
export function miniComputed<T>(getter: () => T): MiniComputed<T> {
  let dirty = true
  let cached: T
  const effect = createEffect(getter, () => {
    // Une dépendance a changé : on invalide, et on prévient ceux qui nous lisent.
    if (!dirty) {
      dirty = true
      trigger(computed, 'value')
    }
  })
  const computed = {
    get value() {
      track(computed, 'value')
      if (dirty) {
        cached = effect.run() as T
        dirty = false
      }
      return cached
    },
  }
  return computed
}

/** Exécute `effect` tout de suite, puis à chaque changement d'une donnée lue. Retourne `stop`. */
export function miniWatchEffect(effect: () => void): () => void {
  const reactiveEffect = createEffect(effect)
  reactiveEffect.run()
  return () => {
    reactiveEffect.active = false
    cleanup(reactiveEffect)
  }
}

const reactiveCache = new WeakMap<object, object>()

/** Bonus : un objet réactif avec Proxy (comme `reactive`), profond et paresseux. */
export function miniReactive<T extends object>(target: T): T {
  const cached = reactiveCache.get(target)
  if (cached) return cached as T
  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key)
      const value = Reflect.get(obj, key, receiver)
      return typeof value === 'object' && value !== null ? miniReactive(value) : value
    },
    set(obj, key, value, receiver) {
      const old = Reflect.get(obj, key, receiver)
      const ok = Reflect.set(obj, key, value, receiver)
      if (!Object.is(old, value)) trigger(obj, key)
      return ok
    },
  })
  reactiveCache.set(target, proxy)
  return proxy
}
