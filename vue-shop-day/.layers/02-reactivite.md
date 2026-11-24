---
title: "02 - La réactivité de l'intérieur"
description: "Écrire soi-même le cœur de ref, computed, watchEffect et reactive, puis s'en servir : un customRef de recherche avec temporisation branché sur le catalogue, et les trois pièges classiques (destructuring, shallowRef, markRaw)."
---

Vous utilisez `ref`, `computed` et `watchEffect` tous les jours. Cette étape vous les fait réécrire en une centaine de lignes, pour que le comportement de Vue cesse d'être une règle à retenir et devienne une conséquence : pourquoi un `watchEffect` ne se relance que pour ce qu'il a lu, pourquoi un `computed` est paresseux, pourquoi `const { count } = state` casse tout. Vous ferez ensuite le chemin inverse : l'API publique de Vue (`customRef`, `shallowRef`, `markRaw`, `toRefs`) pour une vraie recherche dans le catalogue, et pour les trois pièges que le moteur explique.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape précédente, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 01`. Le script écrase les fichiers de votre application : copiez ce que vous voulez garder avant.

**Durée** : environ 50 min pour le cœur (sections 02.1 à 02.4, 02.6, 02.7 et 02.11), 20 min de plus si vous faites aussi les parties facultatives (02.5 et 02.8 à 02.10).

Cette étape est un **objectif** : vous écrivez le code, des tests fournis le vérifient. Chaque exercice a ses critères, des indices qui s'ouvrent un par un, et une solution à ne regarder qu'en dernier recours.

## 02.1 - Ce que Vue fait quand vous lisez une donnée

Une donnée réactive n'est pas observée en permanence : Vue **observe qui la lit**. Quand un effet (un rendu, un `watchEffect`, un `computed`) s'exécute, Vue le note comme **effet actif**. Chaque lecture d'une donnée réactive appelle alors `track(cible, clé)`, qui inscrit l'effet actif dans l'ensemble des abonnés de cette clé. Chaque écriture appelle `trigger(cible, clé)`, qui relance les abonnés. Tout le reste en découle. Le tableau fixe le vocabulaire utilisé dans toute l'étape.

| Mot | Sens |
|---|---|
| effet | une fonction qui lit des données réactives et que Vue peut relancer |
| effet actif | l'effet en cours d'exécution, mémorisé dans une variable de module |
| `track` | appelé à la lecture : abonne l'effet actif à `(cible, clé)` |
| `trigger` | appelé à l'écriture : relance les abonnés de `(cible, clé)` |
| dépendances | les abonnements d'un effet ; elles se recalculent à chaque exécution |

Le registre est une structure à trois niveaux : `WeakMap<cible, Map<clé, Set<effet>>>`. La `WeakMap` laisse le ramasse-miettes libérer une cible que plus personne ne référence. La version de Vue 3.5 organise ces abonnements avec des listes chaînées et des compteurs de version, pour aller plus vite et consommer moins de mémoire ; le principe est celui-ci.

Il y a deux manières de brancher `track` et `trigger` sur une donnée. Un `ref` est une petite boîte avec un accesseur `get value` / `set value` qui les appelle. `reactive` enveloppe un objet entier dans un **Proxy** dont les pièges `get` et `set` les appellent pour n'importe quelle propriété. Vous écrirez les deux, plus `computed`, qui est un effet particulier : il ne s'exécute pas tout seul mais à la lecture, et se contente de se marquer « sale » quand une dépendance change.

📖 [La réactivité en détail](https://vuejs.org/guide/extras/reactivity-in-depth.html).

## 02.2 - Récupérer les squelettes et les tests

Le kit fournit, pour cette étape, trois fichiers à compléter et leurs tests. Copiez-les dans votre application. Le dossier `kit/steps/02` contient déjà son propre dossier `src/` : la commande en copie le contenu à la racine de votre application, et chaque fichier tombe au bon endroit.

```exec
cp -R ~/byte-layers/vue/course/kit/steps/02/. ~/byte-layers/vue/shop/
```

Six fichiers apparaissent : trois squelettes, dont les fonctions jettent `new Error('À écrire')`, et leurs trois fichiers `.spec.ts`, qui sont les tests à rendre verts. Les trois squelettes sont :

| Fichier | Rôle |
|---|---|
| `src/lib/mini-reactivity.ts` | le moteur : `miniRef`, `miniWatchEffect`, `miniComputed`, `miniReactive` |
| `src/composables/useDebouncedRef.ts` | un `customRef` à temporisation |
| `src/lib/reactivity-pitfalls.ts` | trois composables qui évitent trois pièges |

Les tests sont des spécifications : ouvrez-les pour savoir ce qu'on attend, sans les modifier.

```verify
D=~/byte-layers/vue/shop
for f in src/lib/mini-reactivity.ts src/lib/mini-reactivity.spec.ts src/composables/useDebouncedRef.ts src/composables/useDebouncedRef.spec.ts src/lib/reactivity-pitfalls.ts src/lib/reactivity-pitfalls.spec.ts; do
  [ -f "$D/$f" ] || { echo "Il manque $f : relancez la commande de la section 02.2."; exit 1; }
done
echo "Les squelettes et leurs tests sont dans l'application."
```

## 02.3 - Écrire le suivi des dépendances, `miniRef` et `miniWatchEffect`

Ouvrez `src/lib/mini-reactivity.ts`. Le fichier déclare déjà le type `Effect`, la variable `activeEffect` et le registre `targetMap`. Il vous reste six fonctions à écrire, dans l'ordre du fichier, chacune avec son `TODO` : `cleanup` (TODO 1), `createEffect` (2), `track` (3), `trigger` (4), `miniRef` (5) et `miniWatchEffect` (7). Laissez `miniComputed` et `miniReactive` pour les sections suivantes. La première ligne du fichier est un commentaire `eslint-disable` posé pour le squelette : vous pourrez la supprimer quand toutes les fonctions du fichier seront écrites.

Trois idées guident l'écriture, dites avant le code parce que les tests les vérifient une à une.

- **Les dépendances sont dynamiques.** Un effet qui lit `useB.value ? b.value : a.value` ne dépend que d'une branche à la fois. Avant chaque exécution, l'effet se désabonne de tout (`cleanup`) ; l'exécution le réabonne à ce qu'elle lit réellement.
- **Les effets s'imbriquent.** Un effet peut en créer un autre pendant son exécution. En sortant, l'enfant doit remettre en place l'effet actif **précédent**, sinon les lectures suivantes du parent s'abonneraient à l'enfant. Le `finally` couvre le cas où la fonction jette.
- **Un effet ne se déclenche pas lui-même.** Un effet qui écrit la donnée qu'il lit bouclerait à l'infini : `trigger` ignore l'effet actif. Il itère aussi sur une **copie** de l'ensemble, parce que `run()` modifie cet ensemble (`cleanup`, puis réinscription) pendant la boucle.

Pour `miniRef`, ne relancez personne si la nouvelle valeur est identique à l'ancienne : Vue compare avec `Object.is`.

**À vous** : implémentez ces six fonctions.

**Critères :**
- `miniRef` lit et écrit sa valeur, et ne notifie pas pour une valeur identique ;
- `miniWatchEffect` s'exécute tout de suite, puis à chaque changement d'une donnée **lue**, et seulement celles-là ;
- une branche abandonnée ne déclenche plus rien, et `stop()` désabonne tout ;
- un effet qui écrit ce qu'il lit ne boucle pas, et un effet enfant ne vole pas les lectures de son parent ;
- un effet arrêté (`active` à faux) ne s'abonne plus : son `run()` exécute simplement la fonction.

```hint
`cleanup` parcourt `effect.deps` (un tableau d'ensembles), retire l'effet de chacun, puis vide le tableau. `track` ajoute l'effet actif à l'ensemble de `(target, key)` **et** l'ensemble à `activeEffect.deps` : c'est ce qui permet à `cleanup` de retrouver ses abonnements.
```

```hint
Dans `createEffect`, `run()` commence par `if (!effect.active) return fn()` (un effet arrêté ne s'abonne plus), puis fait dans l'ordre : `cleanup(effect)`, mémoriser `activeEffect` dans une variable `previous`, poser `activeEffect = effect`, exécuter `fn()` dans un `try`, et dans le `finally` remettre `activeEffect = previous`. `miniRef` est un objet avec `get value()` qui appelle `track(ref, 'value')`, et `set value(next)` qui, si `!Object.is(next, current)`, mémorise puis appelle `trigger(ref, 'value')`.
```

````solution
La solution complète est dans le kit : [`kit/solutions/02/src/lib/mini-reactivity.ts`](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/02/src/lib/mini-reactivity.ts). Voici le cœur : `createEffect`, `track`, `trigger` et `miniRef`.

```ts
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
      cleanup(effect)
      const previous = activeEffect
      activeEffect = effect
      try {
        return fn()
      } finally {
        activeEffect = previous
      }
    },
  }
  return effect
}

function track(target: object, key: PropertyKey) {
  if (!activeEffect) return
  let keyMap = targetMap.get(target)
  if (!keyMap) targetMap.set(target, (keyMap = new Map()))
  let dep = keyMap.get(key)
  if (!dep) keyMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

function trigger(target: object, key: PropertyKey) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  for (const effect of [...dep]) {
    if (effect === activeEffect) continue
    if (effect.scheduler) effect.scheduler()
    else effect.run()
  }
}

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

export function miniWatchEffect(effect: () => void): () => void {
  const reactiveEffect = createEffect(effect)
  reactiveEffect.run()
  return () => {
    reactiveEffect.active = false
    cleanup(reactiveEffect)
  }
}
```
````

Lancez les tests de `miniRef` et de `miniWatchEffect`. Tant que le fichier est un squelette, la commande échoue : c'est le signal de départ.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/mini-reactivity.spec.ts -t 'miniRef|miniWatchEffect' >/dev/null 2>&1) || { echo "Des tests de miniRef ou miniWatchEffect échouent : lancez « npx vitest run src/lib/mini-reactivity.spec.ts -t miniWatchEffect » dans $D et lisez le premier test rouge. Les fonctions à écrire sont cleanup, createEffect, track, trigger, miniRef et miniWatchEffect."; exit 1; }
echo "miniRef et miniWatchEffect passent leurs tests."
```

## 02.4 - Écrire `miniComputed`, paresseux et mis en cache

Un `computed` évite deux gaspillages : calculer une valeur dont personne n'a besoin, et la recalculer à chaque lecture quand rien n'a changé. Il est donc **paresseux** (le getter ne s'exécute qu'à la première lecture) et **mis en cache** (il ne se réexécute qu'après le changement d'une source). Pour l'obtenir avec ce que vous avez déjà, un `computed` est un effet doté d'un **scheduler** : quand une source change, `trigger` n'appelle pas `run()` mais le scheduler, qui se contente de marquer la valeur « sale » et de prévenir ceux qui lisent le `computed`. Le recalcul n'a lieu qu'à la prochaine lecture.

Cela fait du `computed` à la fois un abonné (de ses sources) et une source (pour ses lecteurs) : sa lecture appelle `track`, et son scheduler appelle `trigger`. C'est ce qui permet de les chaîner.

**À vous** : implémentez `miniComputed` (TODO 6).

**Critères :**
- le getter n'est pas appelé à la création, ni une deuxième fois tant que les sources ne changent pas ;
- un changement de source ne recalcule pas tout de suite : le recalcul a lieu à la lecture suivante ;
- un `miniWatchEffect` qui lit un `miniComputed` est relancé quand la source change, y compris à travers un deuxième `miniComputed`.

```hint
Gardez deux variables : `dirty` (vraie au départ) et `cached`. Créez l'effet avec `createEffect(getter, scheduler)`. La lecture appelle `track(computed, 'value')`, puis, si `dirty`, exécute `effect.run()`, range le résultat dans `cached` et passe `dirty` à faux.
```

```hint
Le scheduler passe `dirty` à vrai, puis appelle `trigger(computed, 'value')` pour réveiller les lecteurs. Protégez-le d'un `if (!dirty)` : s'il est déjà sale, ses lecteurs ont déjà été prévenus.
```

````solution
```ts
export function miniComputed<T>(getter: () => T): MiniComputed<T> {
  let dirty = true
  let cached: T
  const effect = createEffect(getter, () => {
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
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/mini-reactivity.spec.ts -t 'miniComputed' >/dev/null 2>&1) || { echo "Des tests de miniComputed échouent : lancez « npx vitest run src/lib/mini-reactivity.spec.ts -t miniComputed » dans $D et lisez le premier test rouge."; exit 1; }
echo "miniComputed est paresseux, mis en cache et chaînable."
```

## 02.5 - Facultatif : écrire `miniReactive`, la moitié Proxy

Cette section est facultative (environ 8 min) : le rattrapage de l'étape suivante fournit le fichier complet, et le reste du lab n'en dépend pas.

`ref` ne couvre qu'une valeur. Pour un objet entier, Vue enveloppe la cible dans un **Proxy** : un objet de remplacement dont le piège `get` est appelé à chaque lecture de propriété, et `set` à chaque écriture. C'est l'endroit naturel pour appeler `track` et `trigger`, avec la propriété comme clé. Deux détails font la différence entre un jouet et le vrai comportement :

- la réactivité est **profonde et paresseuse** : si la valeur lue est un objet, `get` renvoie son proxy (créé à la demande), pour que `state.user.name = 'Grace'` déclenche aussi ;
- il faut **un seul proxy par objet** : sans cache (`WeakMap<cible, proxy>`), deux lectures de `state.user` renverraient deux proxys différents et `state.user === state.user` serait faux.

**À vous** : implémentez `miniReactive` (TODO 8). Appuyez-vous sur `Reflect.get` et `Reflect.set` plutôt que sur `obj[key]`, pour que `this` reste correct dans les accesseurs.

**Critères :** lire une propriété, y compris imbriquée, abonne l'effet actif ; écrire une propriété d'une valeur différente relance les abonnés de cette propriété seulement.

```hint
Déclarez un `WeakMap` au niveau du module pour le cache. Dans `get(obj, key, receiver)` : `track(obj, key)`, lisez avec `Reflect.get`, et si le résultat est un objet non nul, renvoyez `miniReactive(valeur)`. Dans `set(obj, key, value, receiver)` : lisez l'ancienne valeur, écrivez avec `Reflect.set`, puis appelez `trigger(obj, key)` si `!Object.is(ancienne, value)`.
```

````solution
```ts
const reactiveCache = new WeakMap<object, object>()

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
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/mini-reactivity.spec.ts >/dev/null 2>&1) || { echo "Des tests de mini-reactivity.spec.ts échouent : lancez « npx vitest run src/lib/mini-reactivity.spec.ts » dans $D et lisez le premier test rouge."; exit 1; }
grep -q 'À écrire' "$D/src/lib/mini-reactivity.ts" && { echo "Il reste une fonction « À écrire » dans mini-reactivity.ts."; exit 1; }
echo "Le moteur de réactivité complet passe ses 13 tests."
```

## 02.6 - Écrire un `customRef` de recherche avec temporisation

Le moteur vous a montré où Vue place `track` et `trigger`. `customRef` vous les donne : c'est l'API publique pour fabriquer un ref dont **vous** décidez quand les lecteurs sont prévenus. Vous passez une fabrique qui reçoit `track` et `trigger` et renvoie un objet `{ get, set }`. Le cas d'école est la **temporisation** (debounce) : une recherche ne doit pas partir à chaque frappe mais après 300 ms de silence. Ici, `set` n'écrit pas tout de suite : il arme un minuteur qui, à son échéance, pose la valeur puis appelle `trigger()`.

Deux soins pour qu'il soit utilisable dans un composant :

- une nouvelle écriture **annule** le minuteur précédent, sinon chaque frappe finirait par se déclencher ;
- si le ref est créé dans un composant (ou un `effectScope`), un minuteur en attente ne doit pas survivre à sa destruction. Un **scope** regroupe les effets, les `watch` et les nettoyages créés pendant son exécution, pour les arrêter d'un coup (`scope.stop()`) : chaque composant en a un. `getCurrentScope()` dit si l'on est dans un scope, `onScopeDispose(fn)` y enregistre un nettoyage. 📖 [`effectScope` et `onScopeDispose`](https://vuejs.org/api/reactivity-advanced.html#effectscope).

**À vous** : complétez `src/composables/useDebouncedRef.ts`, qui renvoie un `Ref<T>` initialisé à `initial`, avec un délai par défaut de 300 ms.

**Critères :**
- la lecture renvoie la dernière valeur **posée**, pas la dernière écrite : avant la fin du délai, l'ancienne valeur ;
- une rafale d'écritures ne pose que la dernière, et un `watch` n'est prévenu qu'une fois ;
- après la destruction du scope, plus aucun minuteur n'est en attente.

```hint
La fabrique de `customRef` est `(track, trigger) => ({ get() { … }, set(next) { … } })`. `get` appelle `track()` puis renvoie la valeur posée. Gardez le minuteur dans une variable de la fonction `useDebouncedRef`, pas dans la fabrique : le nettoyage de scope en a besoin.
```

````solution
```ts
import { customRef, getCurrentScope, onScopeDispose, type Ref } from 'vue'

export function useDebouncedRef<T>(initial: T, delay = 300): Ref<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  if (getCurrentScope()) onScopeDispose(cancel)

  return customRef<T>((track, trigger) => {
    let value = initial
    return {
      get() {
        track()
        return value
      },
      set(next) {
        cancel()
        timer = setTimeout(() => {
          timer = undefined
          value = next
          trigger()
        }, delay)
      },
    }
  })
}
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/composables/useDebouncedRef.spec.ts >/dev/null 2>&1) || { echo "Des tests de useDebouncedRef échouent : lancez « npx vitest run src/composables/useDebouncedRef.spec.ts » dans $D et lisez le premier test rouge."; exit 1; }
echo "useDebouncedRef pose la dernière valeur après le délai, et ne laisse aucun minuteur orphelin."
```

📖 [`customRef`, `shallowRef`, `triggerRef`, `markRaw`](https://vuejs.org/api/reactivity-advanced.html).

## 02.7 - Brancher la recherche sur le catalogue

Ce composable n'a de valeur que branché sur quelque chose. `src/api/products.ts` offre déjà `searchProducts(q, signal)`, qui appelle `GET /products/search?q=`. Vous allez ajouter à `ProductListPage.vue` un champ de recherche dont la frappe reste fluide mais dont les requêtes sont temporisées.

Il y a un piège, et c'est le même que celui du `get` de `useDebouncedRef`. Le ref temporisé renvoie à la lecture la valeur **posée**, en retard de 300 ms sur la frappe. Branché directement en `v-model` sur un champ de saisie, le texte reculerait sous les doigts de l'utilisateur à chaque lecture. On sépare donc deux rôles : `draft`, un `ref` ordinaire qui suit la frappe à l'instant, et `query`, le ref temporisé, que seule la recherche lit.

Une deuxième difficulté est propre au réseau : une requête lancée plus tôt peut répondre **après** une plus récente et l'écraser. Chaque appel à `searchProducts` accepte un `AbortSignal` : on garde l'`AbortController` de la requête en cours, on l'annule avant d'en lancer une autre, et on ignore l'erreur d'annulation.

Ouvrez `src/features/products/pages/ProductListPage.vue` dans votre éditeur. Voici son script actuel : il charge la liste une fois au montage, sans annulation.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listProducts } from '@/api/products'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    products.value = (await listProducts()).products
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>
```

Les deux fonctions d'accès, dans `src/api/products.ts`, acceptent chacune un signal d'annulation en dernier argument : `listProducts(params: { limit?: number; skip?: number } = {}, signal?: AbortSignal)` (premier argument : un objet, `{}` pour les valeurs par défaut) et `searchProducts(q: string, signal?: AbortSignal)`. Le gabarit teste d'abord `loading`, puis `error`, puis affiche la liste : l'état vide s'insère entre l'erreur et la liste, et ne s'affiche donc jamais pendant le chargement.

**À vous** : dans ce fichier, ajoutez la recherche. Les gestes sont les suivants :

1. importez `useDebouncedRef` depuis `@/composables/useDebouncedRef` et `searchProducts` depuis `@/api/products`, à côté de `listProducts` ;
2. déclarez `draft = ref('')` et `query = useDebouncedRef('', 300)` ;
3. remplacez le chargement du `onMounted` par une fonction `load()` qui choisit `searchProducts(q, signal)` quand `query` est non vide et `listProducts({}, signal)` sinon, avec un `AbortController` ; lancez-la au montage et à chaque changement de `query` (`watch`) ;
4. ajoutez au gabarit, au-dessus de la liste, un `<v-text-field>` de label « Rechercher un produit », avec `data-testid="product-search"`, lié à `draft` ; chaque saisie met à jour `draft` **et** `query` ;
5. ajoutez un état vide : une `<v-alert>` avec `data-testid="product-list-empty"`, affichée quand la requête a réussi sans produit.

Les `data-testid` suivent la convention de l'étape 01 : `product-search` pour la zone `product` et l'élément `search`, `product-list-empty` pour la zone `product-list`. Pour un `<v-text-field>`, l'attribut atterrit sur l'élément racine du champ, pas sur l'`<input>` : un test retrouve le champ par son label.

**Critères :**
- la page lit `useDebouncedRef` et appelle `searchProducts` ;
- le champ est retrouvable par son label et par `data-testid="product-search"` ;
- une rafale de frappes ne lance qu'une seule requête de recherche, 300 ms après la dernière, et le champ garde le texte tapé ;
- l'état vide a `data-testid="product-list-empty"` ;
- le projet passe `npm run type-check` et ESLint.

```hint
Dans `onMounted`, il n'y a plus rien à écrire d'autre que `load()` : `onMounted(load)`. Pour les annulations, déclarez `let controller: AbortController | undefined` au niveau du script, et au début de `load()` faites `controller?.abort()` puis `const current = (controller = new AbortController())`.
```

```hint
Dans le `catch`, si `current.signal.aborted` est vrai, quittez sans toucher à `error` : la requête a été remplacée. Faites de même pour `loading` dans le `finally`. Ajoutez un `onScopeDispose(() => controller?.abort())` pour couper la requête en cours quand on quitte la page. Le champ : `:model-value="draft"` et `@update:model-value="onInput"`, où `onInput(value: string | null)` écrit `value ?? ''` dans `draft` et dans `query`.
```

````solution
Le fichier complet est dans le kit : [`kit/solutions/02/src/features/products/pages/ProductListPage.vue`](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/02/src/features/products/pages/ProductListPage.vue). Voici son script.

```vue
<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue'
import { listProducts, searchProducts } from '@/api/products'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const draft = ref('')
const query = useDebouncedRef('', 300)

function onInput(value: string | null) {
  draft.value = value ?? ''
  query.value = draft.value
}

let controller: AbortController | undefined

async function load() {
  controller?.abort()
  const current = (controller = new AbortController())
  loading.value = true
  error.value = null
  try {
    const q = query.value.trim()
    const result = q
      ? await searchProducts(q, current.signal)
      : await listProducts({}, current.signal)
    products.value = result.products
  } catch (e) {
    if (current.signal.aborted) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (!current.signal.aborted) loading.value = false
  }
}

onMounted(load)
watch(query, load)
onScopeDispose(() => controller?.abort())
</script>
```

Dans le gabarit, le champ est `<v-text-field :model-value="draft" label="Rechercher un produit" type="search" clearable hide-details data-testid="product-search" @update:model-value="onInput" />`, et l'état vide un `<v-alert v-else-if="products.length === 0" data-testid="product-list-empty">`, placé entre l'alerte d'erreur et la liste.
````

Vous pouvez aussi vérifier à la main que la temporisation joue son rôle : avec `npm run dev` lancé, ouvrez la page Produits, l'onglet **Réseau** des outils du navigateur, et tapez `phone` rapidement dans le champ. Une seule requête `search?q=phone` doit partir, 300 ms après la dernière frappe, et non cinq.

Le bloc ci-dessous contrôle ce comportement pour de vrai. Il écrit un test jetable qui monte la page, simule cinq frappes espacées de 80 ms avec un faux `fetch`, compte les requêtes de recherche, puis supprime ce test. Il accepte toute écriture qui produit ce comportement.

```verify
D=~/byte-layers/vue/shop
P="$D/src/features/products/pages/ProductListPage.vue"
T="$D/src/features/products/pages/zz-verify.spec.ts"
grep -qE "data-testid=[\"']product-search[\"']" "$P" || { echo "Le champ de recherche n'a pas data-testid=\"product-search\"."; exit 1; }
grep -qE "data-testid=[\"']product-list-empty[\"']" "$P" || { echo "L'état vide n'a pas data-testid=\"product-list-empty\"."; exit 1; }
cat > "$T" <<'EOF'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import ProductListPage from './ProductListPage.vue'

const reply = (q: string) => ({ products: q ? [{ id: 1, title: q, price: 1, thumbnail: '' }] : [], total: 0, skip: 0, limit: 12 })

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => reply(new URL(url).searchParams.get('q') ?? '') })))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('une seule requête de recherche pour une rafale de frappes', async () => {
  const wrapper = mount(ProductListPage, { global: { plugins: [vuetify], stubs: { ProductCard: true } } })
  await flushPromises()
  const input = wrapper.find('input')
  for (const text of ['p', 'ph', 'pho', 'phon', 'phone']) {
    await input.setValue(text)
    vi.advanceTimersByTime(80)
  }
  vi.advanceTimersByTime(400)
  await flushPromises()
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
  expect(calls.filter((u) => u.includes('/products/search'))).toHaveLength(1)
  expect(calls.some((u) => u.includes('q=phone'))).toBe(true)
  expect((input.element as HTMLInputElement).value).toBe('phone')
})
EOF
(cd "$D" && npx vitest run src/features/products/pages/zz-verify.spec.ts >/dev/null 2>&1); R=$?
rm -f "$T"
[ $R -eq 0 ] || { echo "La recherche ne se comporte pas comme attendu : cinq frappes rapides doivent donner une seule requête « search?q=phone », et le champ doit garder le texte tapé. Relisez les gestes 2 à 4 de la section 02.7 (draft, query temporisée, watch sur query)."; exit 1; }
(cd "$D" && npm run type-check >/dev/null 2>&1) || { echo "npm run type-check échoue : lancez-le dans $D et lisez la première erreur."; exit 1; }
(cd "$D" && npx eslint src/features/products >/dev/null 2>&1) || { echo "ESLint signale des erreurs : lancez npx eslint src/features/products dans $D."; exit 1; }
echo "Une rafale de frappes ne lance qu'une requête de recherche, les data-testid sont posés, et le projet compile."
```

## 02.8 - Facultatif : piège 1, le destructuring d'un objet réactif

Cette section et les deux suivantes sont facultatives (environ 4 min chacune) : le rattrapage de l'étape suivante fournit le fichier.

Le moteur explique pourquoi ce code ne marche pas :

```ts
const state = reactive({ count: 0 })
const { count } = state // lit state.count UNE fois : count vaut 0, un simple nombre
state.count++           // count ne bouge plus
```

Le destructuring exécute la lecture `state.count` à cet instant, hors de tout effet, et copie un nombre. Plus aucun lien avec le proxy. Vue fournit `toRefs(state)` : il transforme chaque propriété en un `ref` qui **pointe** vers la propriété de l'objet source, donc on peut le destructurer sans rien perdre. C'est ce qu'on utilise pour qu'un composable renvoie `{ count, step }` utilisables directement.

**À vous** : dans `src/lib/reactivity-pitfalls.ts`, écrivez `useCounterState` (TODO 1) : un `reactive({ count: initial, step: 1 })`, une fonction `increment()` qui fait `state.count += state.step`, et un retour `{ ...toRefs(state), increment }`.

**Critères :** `count` et `step` sont des refs (`count.value`), restent synchronisés avec l'état après destructuring, et `increment()` lit le `step` courant.

```hint
`toRefs` s'importe de `vue`. Étaler le résultat dans l'objet de retour donne un `count` et un `step` de type `Ref<number>`.
```

````solution
```ts
import { reactive, toRefs } from 'vue'

export function useCounterState(initial = 0) {
  const state = reactive({ count: initial, step: 1 })
  function increment() {
    state.count += state.step
  }
  return { ...toRefs(state), increment }
}
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/reactivity-pitfalls.spec.ts -t 'destructuring' >/dev/null 2>&1) || { echo "Le test du destructuring échoue : lancez « npx vitest run src/lib/reactivity-pitfalls.spec.ts -t destructuring » dans $D. useCounterState doit renvoyer des refs (toRefs)."; exit 1; }
echo "useCounterState reste réactif une fois destructuré."
```

📖 [`toRefs`](https://vuejs.org/api/reactivity-utilities.html#torefs).

## 02.9 - Facultatif : piège 2, une grande liste qu'on ne veut pas rendre profonde

`ref` et `reactive` sont **profonds** : chaque objet imbriqué est enveloppé dans un proxy, à la première lecture. C'est pratique, et inutile pour une grande liste de données qu'on ne modifie jamais en place (les résultats d'une API, un historique). Chaque élément lu paie alors un proxy et un abonnement pour rien. `shallowRef` ne suit que le **remplacement** de `.value` : les éléments ne sont pas proxifiés.

La contrepartie est qu'une mutation en place est **invisible** : `list.value.push(x)` ne notifie personne. Pour mettre à jour, on remplace le tableau (`list.value = [...list.value, x]`). Quand on a muté en place malgré tout (par exemple dans une boucle chaude, pour éviter une copie), `triggerRef(list)` force la notification.

**À vous** : écrivez `useRawList` (TODO 2) : un `shallowRef` initialisé à `initial`, `append(item)` qui **remplace** le tableau, et `refresh()` qui appelle `triggerRef`.

**Critères :** les éléments ne sont pas réactifs (`isReactive` est faux) ; `append` notifie ; une mutation en place ne notifie qu'après `refresh()`.

```hint
`shallowRef` et `triggerRef` s'importent de `vue`. Le type de `list` est `ShallowRef<T[]>`.
```

````solution
```ts
import { shallowRef, triggerRef, type ShallowRef } from 'vue'

export function useRawList<T extends object>(initial: T[] = []) {
  const list: ShallowRef<T[]> = shallowRef(initial)
  function append(item: T) {
    list.value = [...list.value, item]
  }
  function refresh() {
    triggerRef(list)
  }
  return { list, append, refresh }
}
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/reactivity-pitfalls.spec.ts -t 'shallowRef' >/dev/null 2>&1) || { echo "Les tests de shallowRef échouent : lancez « npx vitest run src/lib/reactivity-pitfalls.spec.ts -t shallowRef » dans $D. useRawList doit utiliser shallowRef et remplacer le tableau dans append."; exit 1; }
echo "useRawList notifie au remplacement, et sur refresh() après une mutation en place."
```

## 02.10 - Facultatif : piège 3, un objet qu'il ne faut pas proxifier

Certains objets n'ont rien à faire dans un proxy : une instance de bibliothèque (un graphique, une carte, une connexion) a des champs privés, une identité qu'on compare par `===`, ou un état interne que Vue n'a pas à surveiller. Rangé dans un `reactive`, un objet devient un proxy : `state.engine !== engine`, et des méthodes qui reposent sur des champs privés peuvent échouer. `markRaw(objet)` marque l'objet : Vue ne l'enveloppera **jamais**, où qu'il soit rangé. L'étape 05 s'en servira pour le client temps réel.

**À vous** : écrivez `attachEngine` (TODO 3) : elle range le moteur dans `state.engine` en le marquant brut.

**Critères :** après l'appel, `state.engine` est la **même référence** que le moteur, et `isReactive(state.engine)` est faux.

```hint
`state.engine = markRaw(engine)`.
```

````solution
```ts
import { markRaw } from 'vue'

export function attachEngine<E extends object>(state: { engine: E | null }, engine: E) {
  state.engine = markRaw(engine)
}
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/lib/reactivity-pitfalls.spec.ts -t 'markRaw' >/dev/null 2>&1) || { echo "Le test de markRaw échoue : lancez « npx vitest run src/lib/reactivity-pitfalls.spec.ts -t markRaw » dans $D. attachEngine doit ranger markRaw(engine)."; exit 1; }
grep -q 'À écrire' "$D/src/lib/reactivity-pitfalls.ts" "$D/src/composables/useDebouncedRef.ts" && { echo "Il reste une fonction « À écrire » dans reactivity-pitfalls.ts ou useDebouncedRef.ts."; exit 1; }
echo "Les trois pièges sont couverts, et plus aucune fonction n'est à écrire."
```

## 02.11 - Toute la suite de tests

Pour finir, lancez la suite avec `npm test -- --run` dans `~/byte-layers/vue/shop` (une seule passe, pas de mode interactif) : les tests du starter (le panier) et ceux de l'étape. Vitest doit annoncer 2 tests pour le panier, 10 pour le moteur (13 avec `miniReactive`), 5 pour `useDebouncedRef`, et 4 de plus si vous avez fait les trois pièges. Le bloc ci-dessous contrôle le cœur de l'étape, avec la vérification de types et ESLint.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/features src/composables >/dev/null 2>&1) || { echo "Des tests du panier ou de useDebouncedRef échouent : lancez npx vitest run src/features src/composables dans $D et lisez le premier fichier rouge."; exit 1; }
(cd "$D" && npx vitest run src/lib/mini-reactivity.spec.ts -t 'miniRef|miniWatchEffect|miniComputed' >/dev/null 2>&1) || { echo "Des tests du moteur échouent : reprenez les sections 02.3 et 02.4."; exit 1; }
(cd "$D" && npm run type-check >/dev/null 2>&1) || { echo "npm run type-check échoue : lancez-le dans $D et lisez la première erreur."; exit 1; }
(cd "$D" && npm run lint >/dev/null 2>&1) || { echo "npm run lint échoue : lancez-le dans $D et corrigez les erreurs signalées."; exit 1; }
echo "Le moteur, la recherche temporisée, le panier, la vérification de types et ESLint passent."
```

## Récap

- Vous avez écrit le cœur de la réactivité : un **effet actif**, `track` à la lecture, `trigger` à l'écriture, des dépendances recalculées à chaque exécution, des effets imbriqués, aucune boucle.
- `ref` est un accesseur, `reactive` un Proxy, `computed` un effet à scheduler : paresseux et mis en cache parce qu'il se contente de se marquer sale.
- `customRef` vous donne `track` et `trigger` : le catalogue a une recherche temporisée (`draft` pour la frappe, `query` pour la requête), avec annulation des requêtes en retard.
- Trois pièges, trois outils : `toRefs` pour le destructuring, `shallowRef` (et `triggerRef`) pour les grandes données non profondes, `markRaw` pour les objets qu'on ne proxifie pas.

Dans l'étape suivante, vous passerez du moteur aux **motifs d'assemblage** : le panier passe de Provide/Inject à un composable puis à un store Pinia, avec une clé d'injection typée, une persistance, un plugin, une directive et l'authentification. L'étape 04 remplacera le chargement à la main de `ProductListPage` par TanStack Query, en réutilisant le `customRef` de cette étape pour la recherche.
