---
title: "03 - Composables, injection, plugins, directive"
description: "Transformer le panier en store Pinia persistant, écrire un plugin de notifications, une directive de compte à rebours, une garde de route et un client http qui renouvelle le jeton une seule fois."
---

La boutique a un panier qui fonctionne, mais fragile : il vit sous un composant fournisseur, il disparaît au rechargement et rien ne protège les pages réservées. Cette étape suit un seul fil : le panier devient un **store Pinia**, puis il est **persisté**, puis on ajoute ce qu'il faut pour qu'un utilisateur connecté puisse le retrouver, et plus tard le passer en caisse : un plugin de notifications, une directive de compte à rebours, une garde de route et un client http qui renouvelle le jeton d'accès sans se tromper. Vous écrivez cinq fichiers, avec des tests fournis, et vous modifiez une dizaine de fichiers de l'application pour que tout fonctionne dans le navigateur.

**Durée** : c'est l'étape la plus dense du lab, **environ 2 heures** (comptez 2 h 30 si vous lisez chaque tableau « Avant / Après » en détail). Les sections 03.6 à 03.9 (plugin de notifications, directive de compte à rebours) sont indépendantes du panier et de l'authentification, mais la suite s'appuie sur elles : si vous prenez du retard, faites-les en vous aidant des solutions, puis consacrez votre temps à la persistance, à la garde et au client http.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 02, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 02` : le script copie le code attendu dans `~/byte-layers/vue/shop` et écrase vos fichiers du même nom, copiez d'abord votre dossier `src` ailleurs si vous voulez garder vos versions.

## 03.1 - Support : copier les fichiers fournis et installer Pinia

Cette section est un **support** : vous préparez le terrain, chaque geste est une commande. Le kit fournit une partie des fichiers de l'étape, et le reste est à écrire par vous. Copiez-les d'un coup dans l'application :

```exec
cp -R ~/byte-layers/vue/course/kit/steps/03/src/. ~/byte-layers/vue/shop/src/
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `cp -R` | copie un dossier avec tout ce qu'il contient |
> | `…/steps/03/src/.` | le point final copie le **contenu** du dossier, sans créer un `src` de plus |
> | `~/byte-layers/vue/shop/src/` | la destination : le dossier `src` de votre application ; les fichiers du même nom sont écrasés |

Voici ce que vous venez de recevoir. Les cinq squelettes sont les fichiers que vous écrirez : leurs fonctions jettent l'erreur `À écrire`, et le type-check passe déjà. Le reste est du code fourni, à lire, pas à modifier.

| Fichier | Nature |
|---|---|
| `features/cart/cartStore.ts` | squelette : le store du panier |
| `plugins/notify.ts` | squelette : le plugin de notifications |
| `directives/countdown.ts` | squelette : la directive `v-countdown` |
| `router/guards.ts` | squelette : la garde d'authentification |
| `api/http.ts` | squelette : le client http (les trois quarts sont fournis) |
| `*.spec.ts` à côté de chaque squelette | les tests qui valident votre travail |
| `features/cart/types.ts`, `router/types.ts` | types fournis (`CartItem`, `meta.requiresAuth`) |
| `features/auth/*`, `components/layout/NotifyHost.vue` | session, pages de connexion et de compte, affichage des notifications |

Installez ensuite Pinia, en version exacte :

```exec
cd ~/byte-layers/vue/shop && npm install -E pinia@4.1.0
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `npm install -E pinia@4.1.0` | ajoute Pinia aux dépendances ; `-E` écrit la version exacte dans `package.json`, sans `^`, pour que tous les postes aient la même |

```verify
D=~/byte-layers/vue/shop
for f in src/features/cart/cartStore.ts src/plugins/notify.ts src/directives/countdown.ts src/router/guards.ts src/api/http.ts src/features/auth/authStore.ts; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez la commande cp de la section 03.1."; exit 1; }
done
[ -d "$D/node_modules/pinia" ] || { echo "Pinia n'est pas installé : lancez npm install -E pinia@4.1.0 dans ~/byte-layers/vue/shop."; exit 1; }
grep -q '"pinia": "4.1.0"' "$D/package.json" || { echo "package.json ne fixe pas pinia à 4.1.0 : relancez la commande avec l'option -E."; exit 1; }
echo "Les fichiers fournis sont en place, et Pinia 4.1.0 est installé."
```

## 03.2 - Du Provide/Inject au store Pinia : choisir

Le panier de l'étape 01 est un composable `useCart()`, que `CartProvider` fournit avec `provide` sous la clé chaîne `'cart'`. Avant de le remplacer, regardons ses trois limites, car elles disent quand un store est le bon outil.

1. **La clé est une chaîne.** `inject<Cart>('cart')` affirme un type que rien ne vérifie, et une faute de frappe dans la chaîne donne `undefined` à l'exécution.
2. **Le panier n'existe que sous `CartProvider`.** Un composant monté ailleurs, un test, une garde de routeur ou un client http ne peuvent pas l'injecter.
3. **Rien ne le conserve** : au rechargement, il repart vide.

La première limite se corrige sans changer d'outil, avec une **clé d'injection typée** : le type voyage avec la clé, et `inject` n'a plus besoin d'annotation.

```ts
import type { InjectionKey } from 'vue'

export const cartKey: InjectionKey<Cart> = Symbol('cart')

// provide(cartKey, useCart())
// const cart = inject(cartKey) // type : Cart | undefined, déduit de la clé
```

Vous retrouverez une clé typée, fournie cette fois, à la section 03.6. Les deux autres limites demandent un autre outil : un **store Pinia**. Un store est une instance unique par application, créée par `defineStore`, accessible partout une fois Pinia installé, et visible dans les Devtools. Le style « setup » de Pinia reprend ce que vous connaissez de `<script setup>` :

| Dans le store | Rôle |
|---|---|
| `ref(…)` | l'état (`state`) |
| `computed(…)` | un getter, calculé à partir de l'état |
| une fonction | une action, qui modifie l'état |

Pour choisir entre les quatre outils de partage, demandez-vous d'abord **qui a besoin de la valeur** :

| Le besoin | L'outil |
|---|---|
| une logique réutilisable, avec un état par appel (un champ avec debounce, un formulaire) | un composable |
| une valeur pour les descendants d'un composant précis (un groupe d'onglets, une configuration de thème) | `provide` / `inject` avec une `InjectionKey` typée |
| un état partagé par des pages sans lien entre elles, qui survit aux changements de route, à lire hors composant, à inspecter et à tester (panier, session) | un store Pinia |
| un service installé une fois pour toute l'application (notifications, internationalisation) | un plugin, qui fait `app.provide` |

Le panier et la session sont dans la troisième ligne, les notifications dans la quatrième. Un détail à retenir : un store est un objet `reactive`, donc ses `computed` s'utilisent **sans** `.value` (`cart.totalItems`), et si vous destructurez un store, passez par `storeToRefs(store)` pour garder la réactivité : c'est le même piège que `toRefs` à l'étape 02.

> 📖 [Pinia : concepts](https://pinia.vuejs.org/core-concepts/) · [Vue : Provide / Inject](https://vuejs.org/guide/components/provide-inject.html) · [Vue : composables](https://vuejs.org/guide/reusability/composables.html)

## 03.3 - Écrire le store du panier

Commençons par la partie qui ne dépend de rien : l'état et ses actions. Ouvrez `src/features/cart/cartStore.ts`. Le store est déjà déclaré avec `defineStore('cart', () => { … })`, et ses actions jettent `À écrire`. La persistance viendra à la section suivante : ici, `items` reste un `ref` vide au départ.

**À vous** : complétez `add`, `remove`, `setQuantity`, `clear`, `totalItems` et `totalPrice`.

**Critères :**

- `add(product, quantity = 1)` ajoute une ligne de quantité 1, ou augmente la quantité si le produit est déjà là ;
- `setQuantity(id, quantity)` fixe la quantité, et supprime la ligne si elle est inférieure ou égale à 0 ;
- `remove(id)` retire une ligne, `clear()` vide le panier ;
- `totalItems` est la somme des quantités et `totalPrice` la somme de `prix × quantité`, tous deux des `computed`.

```hint
Avec un `ref` de tableau, `items.value.find(…)` renvoie l'objet de la ligne, et modifier sa propriété `quantity` suffit : la réactivité suit. Pour retirer une ligne, remplacez le tableau par `items.value.filter(…)`.
```

```hint
`setQuantity` peut appeler `remove` quand la quantité est inférieure ou égale à 0. `totalItems` et `totalPrice` se calculent avec `items.value.reduce(…)`.
```

````solution
```ts
const items = ref<CartItem[]>([])

const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
const totalPrice = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

function add(product: CartProduct, quantity = 1) {
  const existing = items.value.find((item) => item.id === product.id)
  if (existing) existing.quantity += quantity
  else items.value.push({ ...product, quantity })
}

function remove(id: number) {
  items.value = items.value.filter((item) => item.id !== id)
}

function setQuantity(id: number, quantity: number) {
  if (quantity <= 0) return remove(id)
  const existing = items.value.find((item) => item.id === id)
  if (existing) existing.quantity = quantity
}

function clear() {
  items.value = []
}
```
````

Le fichier de tests contient aussi les tests de persistance, que vous satisferez à la section suivante : pour l'instant, on ne lance que les cinq premiers.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/features/cart/cartStore.spec.ts -t 'ajoute un produit|incrémente|modifie la quantité|retire une ligne|calcule le nombre' 2>&1 | grep -q '5 passed') || { echo "Les tests du store échouent : lancez « npx vitest run src/features/cart/cartStore.spec.ts » dans ~/byte-layers/vue/shop ; chaque test dit quelle action ou quel total est faux."; exit 1; }
echo "Le store du panier ajoute, modifie, retire et totalise."
```

## 03.4 - Persister le panier dans localStorage

Un panier qui disparaît au rechargement est une mauvaise surprise pour l'utilisateur. On le sauvegarde dans `localStorage` à chaque changement, et on le relit à la création du store. Deux fonctions du même fichier s'en chargent, `loadCart` et `saveCart`, et le store les branche.

Le point délicat est `loadCart`. Ce qu'on relit vient **de l'extérieur du code** : un autre onglet, une ancienne version de l'application, un utilisateur qui édite le stockage. Elle ne doit donc jamais lever d'exception, et ne doit jamais renvoyer une ligne mal formée qui ferait planter l'affichage. Même principe pour `saveCart` : un stockage plein ou bloqué (navigation privée) ne doit pas casser l'application, le panier reste alors en mémoire.

Le déclencheur de la sauvegarde est un `watch` sur `items`. Un `watch` sur un `ref` de tableau ne se déclenche qu'au **remplacement** du tableau : `existing.quantity++` ne le réveille pas. Il faut l'option `{ deep: true }`, qui observe aussi les modifications internes (à l'étape 02, `shallowRef` supprimait cette profondeur ; ici on la demande explicitement).

**À vous** : dans `cartStore.ts`, écrivez `loadCart` et `saveCart`, faites partir `items` de `loadCart()`, ajoutez le `watch`, puis supprimez la première ligne du fichier (le commentaire `eslint-disable` du squelette).

**Critères :**

- `loadCart` renvoie `[]` si rien n'est sauvegardé, si le JSON est corrompu ou si le contenu n'est pas un tableau ; elle ignore les lignes mal formées : `id`, `price` et `quantity` doivent être des nombres, `title` et `thumbnail` des chaînes, et la quantité un entier strictement positif ;
- `saveCart` écrit le panier en JSON sous la clé `CART_STORAGE_KEY` et n'échoue jamais ;
- le store relit le panier à sa création et le réécrit à chaque changement, y compris un `quantity` modifié en place.

```hint
`JSON.parse` lève une exception sur un texte invalide : enveloppez la lecture dans un `try … catch` qui renvoie `[]`. Pour filtrer, un tableau `parsed.filter(…)` avec une fonction qui vérifie le `typeof` de chaque champ suffit.
```

```hint
Dans le store : `const items = ref<CartItem[]>(loadCart())`, puis `watch(items, (value) => saveCart(value), { deep: true })` avant le `return`. N'oubliez pas d'importer `watch` depuis `vue`.
```

````solution
```ts
import { computed, ref, watch } from 'vue'

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.price === 'number' &&
    typeof item.thumbnail === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  )
}

export function loadCart(storage: Storage = localStorage): CartItem[] {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return [] // JSON corrompu, stockage indisponible : on repart d'un panier vide
  }
}

export function saveCart(items: CartItem[], storage: Storage = localStorage) {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // quota dépassé ou stockage bloqué : le panier reste en mémoire
  }
}

// Dans le store :
const items = ref<CartItem[]>(loadCart())
// … les actions de la section 03.3, puis, avant le return :
watch(items, (value) => saveCart(value), { deep: true })
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/cart/cartStore.ts"
grep -q 'À écrire' "$F" && { echo "cartStore.ts contient encore « À écrire » : complétez loadCart et saveCart."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de cartStore.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
grep -qE 'deep: *true' "$F" || { echo "Le watch du store doit observer en profondeur : ajoutez { deep: true }, sinon une quantité modifiée en place n'est pas sauvegardée."; exit 1; }
(cd "$D" && npx vitest run src/features/cart/cartStore.spec.ts >/dev/null 2>&1) || { echo "Des tests du store échouent : lancez « npx vitest run src/features/cart/cartStore.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message."; exit 1; }
echo "Le store du panier se sauvegarde et se relit sans jamais échouer."
```

> 📖 [Vue : `watch` et son option `deep`](https://vuejs.org/guide/essentials/watchers.html)

## 03.5 - Brancher le store dans l'application

Le store existe, mais l'application utilise encore l'ancien panier. Cette section remplace l'ancien par le nouveau, fichier par fichier. Commencez par installer Pinia dans l'application : remplacez le contenu de `src/main.ts` par ceci.

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(vuetify).use(router)
app.mount('#app')
```

Pinia s'installe **avant** le routeur : à l'installation, le routeur lance la première navigation, et une garde de route qui lit un store a besoin que Pinia soit déjà actif. Il n'y a plus de fournisseur à placer dans l'arbre : remplacez le contenu de `src/App.vue` par la coque simplifiée.

```vue
<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <v-app>
    <AppHeader />
    <v-main>
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>
```

Les quatre consommateurs du panier changent ensuite d'API. Dans chaque fichier, remplacez les lignes de la colonne « Avant » par celles de la colonne « Après ». Les `data-testid` ne bougent pas.

Dans `src/components/layout/AppHeader.vue` :

| Avant | Après |
|---|---|
| `import { useInjectedCart } from '@/features/cart/useCart'` | `import { useCartStore } from '@/features/cart/cartStore'` |
| `const cart = useInjectedCart()` | `const cart = useCartStore()` |
| `cart.totalItems.value` (deux fois, dans le `v-badge`) | `cart.totalItems` |

Dans `src/features/cart/pages/CartPage.vue` :

| Avant | Après |
|---|---|
| `import { useInjectedCart } from '../useCart'` | `import { useCartStore } from '../cartStore'` |
| `const cart = useInjectedCart()` | `const cart = useCartStore()` |
| `cart.state.items` (deux fois : `v-if` et `v-for`) | `cart.items` |
| `cart.removeFromCart(item.id)` | `cart.remove(item.id)` |
| `cart.totalPrice.value` | `cart.totalPrice` |
| `cart.clearCart()` | `cart.clear()` |

Dans `src/features/products/components/ProductCard.vue` et `src/features/products/pages/ProductDetailPage.vue` (la fonction `add` de la fiche est donnée juste après) :

| Avant | Après |
|---|---|
| `import { useInjectedCart } from '@/features/cart/useCart'` | `import { useCartStore } from '@/features/cart/cartStore'` |
| `const cart = useInjectedCart()` | `const cart = useCartStore()` |
| `cart.addToCart(…)` | `cart.add(…)` |

Dans la fiche, l'appel devient `cart.add({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail })`, avec `p` le produit reçu en paramètre.

Enfin, supprimez les trois fichiers de l'ancien panier : `src/features/cart/useCart.ts`, `src/features/cart/CartProvider.vue` et `src/features/cart/useCart.spec.ts`. Le test de l'ancien composable disparaît avec lui : le store a ses propres tests.

```verify
D=~/byte-layers/vue/shop
OLD=$(grep -rlE "useInjectedCart|CartProvider|/useCart'" "$D/src" --include=*.vue | grep -v '/CartProvider.vue$')
[ -z "$OLD" ] || { echo "Ces fichiers utilisent encore l'ancien panier : $OLD"; exit 1; }
grep -q 'createPinia' "$D/src/main.ts" || { echo "main.ts n'installe pas Pinia : reprenez le code de la section 03.5."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop. Si l'erreur cite useCart, vérifiez que vous avez supprimé useCart.ts, CartProvider.vue et useCart.spec.ts, et que plus aucun fichier ne les importe."; exit 1; }
echo "L'application utilise le store du panier, et le type-check passe."
```

Regardons le résultat dans le navigateur. Lancez le serveur de développement, dans un terminal que vous laissez ouvert. Si `npm run dev` tourne encore depuis l'étape 01, arrêtez-le d'abord avec `Ctrl+C` : un nouveau paquet vient d'être installé, et Vite doit repartir de zéro.

```exec
label: "Boutique (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

Ouvrez la page `/products` à l'adresse que Vite affiche (`http://localhost:5173` en général). Si la page affiche une erreur `Failed to fetch dynamically imported module` juste après le démarrage, rechargez-la : Vite réoptimise ses dépendances au premier chargement. Cliquez trois fois sur « Ajouter au panier » : le badge du panier affiche **3**. Rechargez la page : il affiche toujours 3, parce que le panier a été relu depuis `localStorage`. Dans les outils de développement, onglet Application, rubrique Local Storage, la clé `shop.cart` contient les lignes en JSON. Si les Devtools de Vue sont installés, l'onglet Pinia montre le store `cart` et son état.

```acknowledge
J'ai vu le badge rester à 3 après le rechargement
```

## 03.6 - Un plugin : le service de notifications

L'application va avoir besoin de prévenir l'utilisateur : produit ajouté, session expirée. Ce service doit exister **une fois**, être disponible partout et pouvoir être appelé aussi hors d'un composant (une garde de routeur, un client http). C'est le rôle d'un **plugin** : un objet avec une méthode `install(app)`, que `app.use(plugin)` appelle à l'installation. Un plugin peut enregistrer des composants et des directives, ou, comme ici, **fournir une valeur** à toute l'application avec `app.provide`.

La valeur fournie se retrouve avec `inject`, et c'est ici que la clé typée de la section 03.2 devient concrète. Le fichier fournit déjà :

```ts
export const notifyKey: InjectionKey<NotifyApi> = Symbol('notify')
```

Grâce à ce type, `inject(notifyKey)` est un `NotifyApi | undefined`, sans aucune annotation à l'endroit de l'appel. Ouvrez `src/plugins/notify.ts` : les types `Notification`, `NotifyApi` et `NotifyPlugin` sont fournis, et deux fonctions sont à écrire.

**À vous** : écrivez `createNotify` et `useNotify`, puis supprimez la première ligne du fichier (le commentaire `eslint-disable`).

**Critères :**

- `createNotify()` renvoie un plugin qui porte aussi une propriété `api`, utilisable sans composant ;
- `api.queue` lit un état réactif ; `notify(message, kind = 'info', timeout = 4000)` ajoute une notification en fin de file et renvoie son identifiant ; `dismiss(id)` la retire ; les identifiants sont uniques ;
- `install(app)` fournit `api` sous `notifyKey` avec `app.provide` ;
- `useNotify()` renvoie l'API injectée, ou lève une erreur claire qui cite `createNotify` si le plugin n'est pas installé.

```hint
`api.queue` doit lire l'état à chaque accès : écrivez-la comme un accesseur `get queue() { return state.queue }`, avec `const state = reactive({ queue: [] })`. Un compteur `let nextId = 1` donne les identifiants.
```

```hint
Le plugin est un objet `{ api, install(app) { app.provide(notifyKey, api) } }`. Pour `useNotify`, `inject(notifyKey)` renvoie `undefined` si personne n'a fourni la clé : c'est le cas à traiter.
```

````solution
```ts
import { inject, reactive, type InjectionKey, type Plugin } from 'vue'

export function createNotify(): NotifyPlugin {
  let nextId = 1
  const state = reactive<{ queue: Notification[] }>({ queue: [] })

  const api: NotifyApi = {
    get queue() {
      return state.queue
    },
    notify(message, kind = 'info', timeout = 4000) {
      const id = nextId++
      state.queue.push({ id, message, kind, timeout })
      return id
    },
    dismiss(id) {
      state.queue = state.queue.filter((n) => n.id !== id)
    },
  }

  return {
    api, // utilisable hors composant (garde de routeur, client http…)
    install(app) {
      app.provide(notifyKey, api)
    },
  }
}

export function useNotify(): NotifyApi {
  const api = inject(notifyKey)
  if (!api)
    throw new Error('Le plugin de notifications n’est pas installé : app.use(createNotify())')
  return api
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/plugins/notify.ts"
grep -q 'À écrire' "$F" && { echo "notify.ts contient encore « À écrire » : complétez createNotify et useNotify."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de notify.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/plugins/notify.spec.ts >/dev/null 2>&1) || { echo "Les tests du plugin échouent : lancez « npx vitest run src/plugins/notify.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message."; exit 1; }
echo "Le plugin de notifications fournit son API, avec une clé typée."
```

> 📖 [Vue : plugins](https://vuejs.org/guide/reusability/plugins.html)

## 03.7 - Installer le plugin et afficher les toasts

Un plugin n'agit qu'une fois installé. Dans `src/main.ts`, importez `createNotify`, créez le plugin et installez-le avant le routeur. Le plugin est gardé dans une constante : sa propriété `api` s'utilise hors composant.

```ts
import { createNotify } from './plugins/notify'

const notify = createNotify()

app.use(pinia).use(vuetify).use(notify).use(router)
```

Le composant fourni `NotifyHost.vue` affiche la première notification de la file dans un `v-snackbar`. Placez-le dans `src/App.vue`, à la fin du `<v-app>`, avec son import :

```vue
<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import NotifyHost from '@/components/layout/NotifyHost.vue'
</script>

<template>
  <v-app>
    <AppHeader />
    <v-main>
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
    <NotifyHost />
  </v-app>
</template>
```

Enfin, faites parler l'ajout au panier. Dans `ProductCard.vue` et `ProductDetailPage.vue`, importez `useNotify` depuis `@/plugins/notify`, appelez `const notify = useNotify()` à côté de `const cart = …`, et ajoutez une ligne à la fin de la fonction `add`. Dans la carte :

```ts
function add() {
  const { id, title, price, thumbnail } = props.product
  cart.add({ id, title, price, thumbnail })
  notify.notify(`${title} ajouté au panier`, 'success')
}
```

Dans la fiche, la fonction `add` reçoit le produit `p` en paramètre :

```ts
function add(p: Product) {
  cart.add({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail })
  notify.notify(`${p.title} ajouté au panier`, 'success')
}
```

```verify
D=~/byte-layers/vue/shop
grep -q 'createNotify' "$D/src/main.ts" || { echo "main.ts n'installe pas le plugin : ajoutez createNotify() et .use(notify)."; exit 1; }
grep -q 'NotifyHost' "$D/src/App.vue" || { echo "App.vue n'affiche pas NotifyHost : ajoutez l'import et la balise <NotifyHost />."; exit 1; }
for f in src/features/products/components/ProductCard.vue src/features/products/pages/ProductDetailPage.vue; do
  grep -q 'useNotify' "$D/$f" || { echo "$f n'appelle pas useNotify."; exit 1; }
done
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "Le plugin est installé, et l'ajout au panier prévient l'utilisateur."
```

Dans le navigateur, cliquez sur « Ajouter au panier » : un message `… ajouté au panier` apparaît en bas de l'écran pendant quatre secondes. Si vous cliquez plusieurs fois, les messages s'affichent l'un après l'autre : c'est la file du plugin.

```acknowledge
J'ai vu le message apparaître à chaque ajout
```

## 03.8 - Une directive : le compte à rebours

Un composant décrit un morceau d'interface. Une **directive** décrit un comportement à attacher à un élément qui existe déjà : on l'utilise quand il faut toucher au DOM directement, sans rien rendre de plus. Un compte à rebours qui écrit le temps restant dans une balise en est un cas typique, et la future enchère en aura besoin.

Une directive est un objet dont les méthodes sont appelées par Vue à des moments précis de la vie de l'élément :

| Méthode | Quand Vue l'appelle |
|---|---|
| `mounted(el, binding)` | l'élément est dans le DOM : affichez la valeur et armez le minuteur |
| `updated(el, binding)` | le composant qui contient l'élément s'est remis à jour : ne repartez que si la cible a changé, en comparant `binding.value` et `binding.oldValue` |
| `unmounted(el)` | l'élément quitte le DOM : supprimez le minuteur |

La valeur de la directive est un objet `{ endsAt, offset, onEnd }`. L'`offset` est le **décalage d'horloge** : l'heure du serveur moins l'heure du navigateur. Une enchère se termine à l'heure du serveur, pas à celle d'un ordinateur mal réglé : le temps restant est donc `endsAt - (Date.now() + offset)`. Vous le brancherez sur un vrai serveur à l'étape 05.

Une directive n'a pas d'instance où ranger son état, alors que chaque élément a son minuteur. Rangez-le dans une `WeakMap`, indexée par l'élément : quand l'élément disparaît, l'entrée peut être récupérée. Oublier `unmounted` laisse des `setInterval` actifs pour des éléments qui n'existent plus, et les tests le détectent.

Ouvrez `src/directives/countdown.ts`. La déclaration `GlobalDirectives` en bas du fichier est fournie : elle apprend à `vue-tsc` que `v-countdown` existe dans les gabarits.

**À vous** : écrivez `formatRemaining` et les trois méthodes de `vCountdown`, puis supprimez la première ligne du fichier.

**Critères :**

- `formatRemaining(ms)` renvoie `mm:ss` (`90500` donne `01:31`), `h:mm:ss` au-delà d'une heure, jamais de valeur négative, et arrondit à la seconde **supérieure** (500 ms restantes s'affichent `00:01`) ;
- la directive écrit le temps restant dans l'élément tout de suite, puis chaque seconde ;
- à 0, elle arrête son minuteur et appelle `onEnd` **une seule fois**, même si la date est déjà passée au montage ;
- `updated` ne relance que si `endsAt` ou `offset` ont changé, et `unmounted` supprime le minuteur.

```hint
`Math.ceil(ms / 1000)` donne les secondes restantes ; `String(n).padStart(2, '0')` met un zéro devant. Une fonction `start(el, value)` qui arme le minuteur et une fonction `stop(el)` qui le supprime évitent de répéter le code dans les trois méthodes.
```

```hint
L'état d'un élément : `const states = new WeakMap<HTMLElement, { timer: ReturnType<typeof setInterval> | undefined; ended: boolean }>()`. Dans `tick`, le temps restant se calcule à chaque tour avec `Date.now()`, et `onEnd` ne part que si l'état dit qu'il n'est pas déjà parti. Dans `updated`, comparez `binding.oldValue?.endsAt` et `binding.value.endsAt`, puis les `offset`.
```

````solution
```ts
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

interface CountdownState {
  timer: ReturnType<typeof setInterval> | undefined
  ended: boolean
}

const states = new WeakMap<HTMLElement, CountdownState>()

function stop(el: HTMLElement) {
  const state = states.get(el)
  if (state) clearInterval(state.timer)
  states.delete(el)
}

function start(el: HTMLElement, value: CountdownValue) {
  stop(el)
  const state: CountdownState = { timer: undefined, ended: false }
  const tick = () => {
    const remaining = value.endsAt - (Date.now() + (value.offset ?? 0))
    el.textContent = formatRemaining(remaining)
    if (remaining <= 0) {
      clearInterval(state.timer)
      if (!state.ended) {
        state.ended = true
        value.onEnd?.()
      }
    }
  }
  states.set(el, state)
  tick()
  if (!state.ended) state.timer = setInterval(tick, 1000)
}

export const vCountdown: Directive<HTMLElement, CountdownValue> = {
  mounted(el, binding) {
    start(el, binding.value)
  },
  updated(el, binding) {
    const { endsAt, offset } = binding.value
    const old = binding.oldValue
    // On ne relance que si la cible change : pas à chaque rendu du parent.
    if (!old || old.endsAt !== endsAt || old.offset !== offset) start(el, binding.value)
  },
  unmounted(el) {
    stop(el)
  },
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/directives/countdown.ts"
grep -q 'À écrire' "$F" && { echo "countdown.ts contient encore « À écrire » : complétez formatRemaining et les trois méthodes de la directive."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de countdown.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/directives/countdown.spec.ts >/dev/null 2>&1) || { echo "Les tests de la directive échouent : lancez « npx vitest run src/directives/countdown.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message."; exit 1; }
echo "La directive affiche le temps restant, s'arrête à 0 et libère son minuteur."
```

> 📖 [Vue : directives personnalisées](https://vuejs.org/guide/reusability/custom-directives.html)

## 03.9 - Enregistrer la directive et la montrer sur l'accueil

Une directive s'utilise dans un gabarit après son enregistrement. On l'enregistre globalement, parce que plusieurs pages s'en serviront. Dans `src/main.ts`, importez-la et enregistrez-la sous le nom `countdown` (dans le gabarit, ce sera `v-countdown`) :

```ts
import { vCountdown } from './directives/countdown'

app.use(pinia).use(vuetify).use(notify).use(router)
app.directive('countdown', vCountdown)
```

Pour la voir tourner, remplacez le contenu de `src/pages/HomePage.vue` par une page qui annonce une vente flash se terminant dix minutes après son ouverture :

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Vente flash fictive : se termine 10 minutes après l'ouverture de la page.
const flashEndsAt = ref(Date.now() + 10 * 60 * 1000)
</script>

<template>
  <section data-testid="home-page">
    <h1>Bienvenue dans la boutique</h1>
    <p>Un catalogue branché sur DummyJSON, un panier, et bientôt des enchères en direct.</p>
    <p>
      Vente flash, fin dans
      <strong v-countdown="{ endsAt: flashEndsAt }" data-testid="home-flash-countdown" />
    </p>
    <v-btn color="primary" to="/products" data-testid="home-cta">Voir le catalogue</v-btn>
  </section>
</template>
```

```verify
D=~/byte-layers/vue/shop
grep -qE "app\.directive\('countdown', *vCountdown\)" "$D/src/main.ts" || { echo "main.ts n'enregistre pas la directive : ajoutez app.directive('countdown', vCountdown)."; exit 1; }
grep -q 'v-countdown' "$D/src/pages/HomePage.vue" || { echo "HomePage.vue n'utilise pas v-countdown : reprenez le gabarit de la section 03.9."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "La directive est enregistrée et utilisée sur l'accueil."
```

Ouvrez la page `/home` : la page affiche `Vente flash, fin dans 09:59`, puis `09:58` une seconde plus tard. Passez sur une autre page et revenez : le décompte repart de dix minutes, parce que `flashEndsAt` est recalculé à chaque ouverture.

```acknowledge
J'ai vu le compte à rebours descendre sur l'accueil
```

## 03.10 - Protéger les pages : la garde de route

La page « Mon compte » ne doit s'ouvrir qu'avec une session. Le routeur permet d'intercepter chaque navigation avec une **garde** : une fonction appelée avant d'entrer dans une route, qui renvoie `true` pour laisser passer, `false` pour annuler, ou une destination pour rediriger. On marque les routes à protéger dans leurs métadonnées (`meta`), et la garde lit ce marqueur. Le fichier `features/auth/routes.ts`, fourni, déclare déjà `/account` avec `meta: { requiresAuth: true }`, et `router/types.ts` apprend à TypeScript que `meta.requiresAuth` est un booléen facultatif.

Pour revenir sur la page demandée après la connexion, la garde la passe dans l'adresse de connexion : `/login?redirect=/account`. Enfin, `isAuthenticated` est une **fonction**, pas un booléen : la session est relue à chaque navigation, et le store n'est lu qu'au moment où il existe (Pinia n'est pas encore installé quand le module du routeur est importé).

Ouvrez `src/router/guards.ts`.

**À vous** : écrivez `createAuthGuard`, puis supprimez la première ligne du fichier.

**Critères :**

- une route avec `to.meta.requiresAuth` et sans session redirige vers `{ name: 'login', query: { redirect: to.fullPath } }` ;
- la route `login` avec une session ouverte redirige vers `{ name: 'home' }` ;
- toute autre navigation passe (`true`), et la session est relue à chaque navigation.

```hint
Une garde est une fonction `(to, from) => …` : ici seul `to` sert. Renvoyez directement l'objet de destination pour rediriger.
```

````solution
```ts
export function createAuthGuard(isAuthenticated: () => boolean): NavigationGuard {
  return (to) => {
    if (to.meta.requiresAuth && !isAuthenticated()) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.name === 'login' && isAuthenticated()) return { name: 'home' }
    return true
  }
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/router/guards.ts"
grep -q 'À écrire' "$F" && { echo "guards.ts contient encore « À écrire » : écrivez createAuthGuard."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de guards.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/router/guards.spec.ts >/dev/null 2>&1) || { echo "Les tests de la garde échouent : lancez « npx vitest run src/router/guards.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message."; exit 1; }
echo "La garde redirige vers la connexion et relit la session à chaque navigation."
```

Il reste à brancher la garde. Remplacez le contenu de `src/router/index.ts` : on ajoute les routes d'authentification et la garde globale, qui lit le store au moment de la navigation.

Voici le fichier complet :

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { productRoutes } from '@/features/products/routes'
import { cartRoutes } from '@/features/cart/routes'
import { authRoutes } from '@/features/auth/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { createAuthGuard } from './guards'
import './types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
    // Chaque fonctionnalité déclare ses propres routes, dont les pages sont chargées à la demande.
    ...productRoutes,
    ...cartRoutes,
    ...authRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

// Le store est lu au moment de la navigation : Pinia est installé avant la première.
router.beforeEach(createAuthGuard(() => useAuthStore().isAuthenticated))

export default router
```

```verify
D=~/byte-layers/vue/shop
grep -q 'createAuthGuard' "$D/src/router/index.ts" || { echo "Le routeur n'utilise pas la garde : reprenez le code de la section 03.10."; exit 1; }
grep -q 'authRoutes' "$D/src/router/index.ts" || { echo "Le routeur ne déclare pas les routes d'authentification (/login, /account)."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "La garde est branchée sur le routeur."
```

> 📖 [Vue Router : gardes de navigation](https://router.vuejs.org/guide/advanced/navigation-guards.html) · [métadonnées de route](https://router.vuejs.org/guide/advanced/meta.html)

## 03.11 - Le client http : un seul renouvellement de jeton

Les pages protégées appellent l'API avec un **jeton d'accès** (`Authorization: Bearer …`), valable un temps limité, et un **jeton de renouvellement** sert à en obtenir un nouveau. Quand le jeton d'accès expire, l'API répond `401`, et le client doit renouveler puis rejouer la requête, sans que l'utilisateur le voie. Ce comportement vit dans **un seul** client http, que toute l'application utilise : c'est la règle de l'application.

Le piège est le parallélisme. Une page qui lance trois requêtes avec un jeton expiré reçoit trois `401` ; un client naïf lance alors trois renouvellements. Or un jeton de renouvellement ne sert souvent qu'une fois : le deuxième échoue, et l'utilisateur est déconnecté sans raison. La règle est donc : **un seul renouvellement à la fois**, auquel toutes les requêtes en échec s'accrochent, en partageant la même promesse.

Deux cas méritent un soin particulier :

- une requête en vol dont la réponse `401` arrive **après** le renouvellement : le jeton courant n'est plus celui qu'elle a envoyé, il suffit de la rejouer avec le jeton courant, sans renouveler une seconde fois ;
- le rejeu se fait **une seule fois** : si la requête rejouée reçoit encore `401`, on rejette, sinon on boucle.

Le client ne connaît pas le store d'authentification, et c'est voulu : le store importe le client pour appeler `/auth/login`, et un client qui importerait le store créerait un cycle d'imports. Le store branche donc sa session au client avec `http.setAuth({ getAccessToken, refresh, onAuthFailure })`, à la fin de son `defineStore` (lisez `features/auth/authStore.ts`). Les appels de connexion et de renouvellement passent avec `skipAuth: true`, pour ne ni porter de Bearer ni se renouveler eux-mêmes.

Ouvrez `src/api/http.ts`. Le fichier fournit les types, `HttpError`, la fonction `send` (un envoi avec le Bearer), la fonction `parse` (lit le JSON ou lève une `HttpError`) et le client unique `http`. Deux fonctions sont à écrire dans `createHttpClient`.

**À vous** : écrivez `refreshOnce` et `request`, puis supprimez la première ligne du fichier.

**Critères :**

- `refreshOnce()` appelle `options.auth.refresh()` s'il n'y a pas de renouvellement en cours, sinon renvoie la promesse en cours ; elle vide `refreshing` quand elle se termine, succès ou échec, et appelle `onAuthFailure()` une seule fois si le renouvellement échoue ;
- `request` envoie avec le jeton courant ; sur un `401` (hors `skipAuth`), elle rejoue une seule fois avec le jeton renouvelé, ou avec le jeton courant s'il a déjà changé ;
- si le renouvellement échoue, `request` rejette avec `new HttpError(401, path)` ;
- dans tous les cas, `request` termine par `parse(response, path)`.

```hint
Pour `refreshOnce`, l'opérateur `??=` affecte seulement si la variable est vide : `refreshing ??= auth.refresh().catch(…).finally(…)`. Le `.catch` appelle `onAuthFailure()` puis relance l'erreur ; le `.finally` remet `refreshing` à `null`.
```

```hint
Pour `request`, mémorisez le jeton envoyé (`const usedToken = auth?.getAccessToken()`). Sur un `401`, comparez-le au jeton courant : s'ils diffèrent, rejouez avec le courant ; sinon `await refreshOnce()` dans un `try … catch` qui lève la `HttpError(401, path)`.
```

````solution
```ts
function refreshOnce(): Promise<string> {
  const auth = options.auth
  if (!auth) return Promise.reject(new Error('Pas de gestionnaire de session'))
  refreshing ??= auth
    .refresh()
    .catch((error: unknown) => {
      auth.onAuthFailure() // une seule fois : la promesse est partagée
      throw error
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = options.auth
  const usedToken = auth?.getAccessToken() ?? null
  let response = await send(path, opts, usedToken)

  if (response.status === 401 && auth && !opts.skipAuth) {
    // Un renouvellement a peut-être déjà eu lieu pendant que cette requête était en vol :
    // dans ce cas le jeton courant a changé, on rejoue simplement avec lui.
    const current = auth.getAccessToken()
    let token: string
    try {
      token = current && current !== usedToken ? current : await refreshOnce()
    } catch {
      throw new HttpError(401, path)
    }
    response = await send(path, opts, token) // rejeu unique : pas de boucle
  }
  return parse<T>(response, path)
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/api/http.ts"
grep -q 'À écrire' "$F" && { echo "http.ts contient encore « À écrire » : écrivez refreshOnce et request."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de http.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/api/http.spec.ts >/dev/null 2>&1) || { echo "Les tests du client http échouent : lancez « npx vitest run src/api/http.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message ; le test « trois requêtes en échec en parallèle » vérifie qu'un seul renouvellement part."; exit 1; }
echo "Le client http renouvelle le jeton une seule fois, même avec des requêtes en parallèle."
```

## 03.12 - Brancher l'authentification et se connecter

Pour que les appels du catalogue passent aussi par le client unique, remplacez le contenu de `src/api/products.ts` : `fetch` direct disparaît au profit de `http.get`.

```ts
import { http } from './http'
import type { Product, ProductList } from '@/features/products/types'

// Tous les appels passent par le client unique (Bearer, renouvellement de jeton, erreurs typées).

export function listProducts(params: { limit?: number; skip?: number } = {}, signal?: AbortSignal) {
  const { limit = 12, skip = 0 } = params
  return http.get<ProductList>(`/products?limit=${limit}&skip=${skip}`, { signal })
}

export function getProduct(id: number, signal?: AbortSignal) {
  return http.get<Product>(`/products/${id}`, { signal })
}

/** Recherche plein texte : GET /products/search?q= */
export function searchProducts(q: string, signal?: AbortSignal) {
  return http.get<ProductList>(`/products/search?q=${encodeURIComponent(q)}&limit=12`, { signal })
}
```

Le store d'authentification doit exister **dès le démarrage** : c'est en le créant que son `defineStore` branche la session au client http. On l'instancie donc dans `main.ts`, avec l'instance Pinia, et on dit quoi faire quand la session est perdue : prévenir avec le plugin de notifications (c'est là que sa propriété `api` sert, hors composant), puis renvoyer vers la connexion. Dans `src/main.ts`, **ajoutez** l'import en haut et ce bloc juste avant `app.mount('#app')` :

```ts
import { useAuthStore } from './features/auth/authStore'

// Session perdue (renouvellement impossible) : on prévient et on renvoie vers la connexion.
useAuthStore(pinia).onSessionExpired(() => {
  notify.api.notify('Session expirée, reconnectez-vous.', 'error')
  void router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
})
```

Enfin, l'en-tête doit proposer de se connecter, afficher l'utilisateur et permettre de se déconnecter. Dans `src/components/layout/AppHeader.vue`, **ajoutez** ces imports et ces lignes à la partie `<script setup>` :

```ts
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  auth.logout()
  await router.push({ name: 'home' })
}
```

et, dans le gabarit, juste après le `<v-btn icon to="/cart" …>…</v-btn>` du panier :

```vue
<template v-if="auth.isAuthenticated">
  <v-btn variant="text" to="/account" data-testid="header-user">{{ auth.user?.firstName }}</v-btn>
  <v-btn variant="text" data-testid="header-logout" @click="logout">Déconnexion</v-btn>
</template>
<v-btn v-else variant="text" to="/login" data-testid="header-login">Connexion</v-btn>
```

Les nouveaux `data-testid` suivent la convention `zone-élément` du projet : `header-login`, `header-user` et `header-logout` pour l'en-tête, `login-*` et `account-*` pour les pages fournies, `notify` pour le message, `home-flash-countdown` pour le compte à rebours.

```verify
D=~/byte-layers/vue/shop
grep -q 'http.get' "$D/src/api/products.ts" || { echo "api/products.ts n'utilise pas http.get : reprenez le code de la section 03.12."; exit 1; }
grep -q 'fetch(' "$D/src/api/products.ts" && { echo "api/products.ts appelle encore fetch directement : tout passe par http."; exit 1; }
grep -q 'onSessionExpired' "$D/src/main.ts" || { echo "main.ts ne gère pas la session perdue : ajoutez l'appel à useAuthStore(pinia).onSessionExpired(…)."; exit 1; }
grep -q 'header-login' "$D/src/components/layout/AppHeader.vue" || { echo "AppHeader.vue n'a pas le bouton de connexion : reprenez le code de la section 03.12."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "Le catalogue passe par le client unique, et la session est branchée."
```

Vérifions dans le navigateur, le serveur de développement tournant toujours. Le repli hors ligne de la section 01.5 sert aussi ces routes d'authentification. Le compte de démonstration de DummyJSON est `emilys` avec le mot de passe `emilyspass`, prérempli sur la page de connexion.

1. Ouvrez la page `/account` sans être connecté : le navigateur est redirigé vers `/login?redirect=/account`.
2. Cliquez sur « Se connecter » : vous revenez sur `/account`, qui affiche `Emily Johnson`. L'en-tête montre votre prénom et « Déconnexion ».
3. Ouvrez les outils de développement, onglet Network, puis, sur la page `/account`, cliquez sur « Expirer le jeton (démo) » : le jeton d'accès devient invalide, et vous voyez `GET /auth/me` répondre `401`, puis `POST /auth/refresh` répondre `200`, puis `GET /auth/me` répondre `200`. La page n'a rien affiché de tout cela : le nom est toujours là.
4. Pour voir l'échec, ouvrez l'onglet Application, rubrique Local Storage, clé `shop.auth`, et changez la valeur de `refreshToken` en `x`, puis **rechargez la page** (le store ne relit le stockage qu'au démarrage) ; cliquez à nouveau sur « Expirer le jeton ». Le renouvellement est refusé (DummyJSON répond `403`), un message « Session expirée, reconnectez-vous. » s'affiche et vous êtes renvoyé vers `/login?redirect=/account`.

```acknowledge
J'ai vu la connexion, le renouvellement discret du jeton, puis la session expirée
```

> ⚠️ **Ce n'est pas un choix de production.** Le store garde les jetons dans `localStorage` pour que la démonstration survive à un rechargement, et vous venez d'en modifier un à la main : n'importe quel script de la page peut faire de même, et une faille XSS suffit à les voler. En production, le serveur pose le jeton de renouvellement dans un cookie `HttpOnly`, inaccessible au JavaScript.
>
> 📖 [DummyJSON : authentification](https://dummyjson.com/docs/auth)

## 03.13 - Tout vérifier d'un coup

Avant de passer à la suite, il faut que les trois commandes de qualité du projet passent : `npm run type-check` (le type-check de tous les fichiers), `npm run lint` et `npm test` (toute la suite, dont les 41 nouveaux tests de cette étape). Le bouton ci-dessous les lance pour vous, dans cet ordre, et s'arrête au premier échec.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » et lisez la première erreur."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Un fichier écrit garde souvent la première ligne eslint-disable, ou un import inutilisé."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent : l'application est dans l'état de fin d'étape 03."
```

## Récap

- Le panier est passé du **Provide/Inject** à un **store Pinia** ; vous savez choisir entre composable, `provide`/`inject` avec une `InjectionKey` typée, store et plugin, d'après **qui a besoin de la valeur**.
- Le panier est **persisté** : relu défensivement au démarrage, réécrit par un `watch` profond.
- Un **plugin** (`app.use`) fournit un service typé à toute l'application et reste utilisable hors composant.
- Une **directive** (`v-countdown`) gère un comportement sur un élément, avec son état par élément et son nettoyage.
- Une **garde de route** protège les pages et ramène à la page demandée après la connexion.
- Un **client http unique** ajoute le Bearer, renouvelle le jeton **une seule fois** et rejoue la requête une seule fois.

L'étape suivante remplace les `onMounted` + `fetch` du catalogue par un cache serveur, avec TanStack Query.
