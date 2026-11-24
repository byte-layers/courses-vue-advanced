---
title: "08 - Tests unitaires et d'intégration"
description: "Écrire soi-même les tests de la boutique : un composable avec withSetup, un composant avec createTestingPinia, le routeur et sa garde, puis le parcours d'enchère avec offre refusée et retour en arrière, et vérifier que ces tests détectent de vraies régressions."
---

La boutique marche, elle est rapide, et rien ne dit qu'elle le restera. Cette étape est la dernière : vous **écrivez les tests**. Pas des tests qui passent, des tests qui **échouent quand le code est cassé**, ce qui est la seule chose qui compte. Vous écrivez un helper de montage, puis quatre fichiers de tests : les règles d'une offre (un composable), la page du panier (un composant et ses stores), la navigation (le routeur et sa garde) et le parcours complet d'une enchère, où l'offre d'un autre arrive avant le refus de la vôtre. Un script fourni casse ensuite cinq endroits du code, un par un, et contrôle que vos tests le voient.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 07, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 07` : le script copie le code attendu dans `~/byte-layers/vue/shop` (l'option checkout de l'étape 06 comprise), supprime les fichiers devenus obsolètes (par exemple `BidRow.vue`, retiré à l'étape 07) et écrase vos fichiers du même nom, pensez à les committer avant.

**Durée** : environ 95 minutes en écrivant six tests par fichier (comptez 20 à 30 minutes de plus si vous écrivez les 34 tests proposés).

Cette étape est un **objectif** : vous écrivez le code, des commandes fournies le vérifient. Elle s'appuie sur ce que vous avez déjà : `withSetup` et les handlers MSW de l'étape 04, le faux socket de l'étape 05, les `data-testid` de toute l'application. Un conseil de gestion du temps : l'étape exige **au moins six tests par fichier**, et les titres en proposent huit ou dix. Écrivez d'abord les tests marqués ★ (ceux qu'exige le contrôle de la section 08.8), puis complétez jusqu'à six.

## 08.1 - Support : copier les fichiers fournis et installer deux paquets

Cette section est un **support** : chaque geste est une commande. Copiez d'abord les fichiers fournis dans `src`. **Deux fichiers de votre application sont remplacés** : `src/router/index.ts` (il exporte maintenant une fabrique, `createAppRouter`, que les tests utilisent avec un historique en mémoire ; l'application garde le même comportement) et, à la racine, `vite.config.ts` (qui gagne un bloc `coverage`).

```exec
cp -R ~/byte-layers/vue/course/kit/steps/08/src/. ~/byte-layers/vue/shop/src/
```

Les trois fichiers qui vont à la racine de l'application se copient à part : le script de contrôle, la liste des scénarios de bout en bout et la configuration de Vitest.

```exec
cd ~/byte-layers/vue/course/kit/steps/08 && cp mutate.mjs E2E-SCENARIOS.md vite.config.ts ~/byte-layers/vue/shop/
```

Voici ce que vous venez de recevoir. Les cinq fichiers marqués « à écrire » sont les vôtres.

| Fichier | Nature |
|---|---|
| `test/mount-component.ts` | à écrire : le helper `mountWithApp` |
| `test/mount-component.spec.ts` | fourni : les 8 tests qui valident votre helper |
| `features/auctions/useBidRules.spec.ts` | à écrire : 8 `it.todo` (un composable) |
| `features/cart/CartPage.spec.ts` | à écrire : 8 `it.todo` (un composant et ses stores) |
| `router/navigation.spec.ts` | à écrire : 10 `it.todo` (le routeur et sa garde) |
| `features/auctions/auctionFlow.spec.ts` | à écrire : 8 `it.todo` (le parcours d'enchère) |
| `router/index.ts`, `vite.config.ts` | fournis, **remplacent les vôtres** : le routeur est le même, exposé par une fabrique ; la configuration garde le bloc `test.typecheck` de l'étape 06 et gagne un bloc `coverage` |
| `test/handlers.ts` | fourni : des handlers MSW réutilisables (section 08.10) |
| `mutate.mjs` | fourni : le script de contrôle de la section 08.8 |
| `E2E-SCENARIOS.md` | fourni : les cinq scénarios de la session de bout en bout (section 08.10) |

Un `it.todo('…')` est un test **annoncé mais pas écrit** : Vitest l'affiche comme « todo » et sort avec un code 0. **`npm test` est donc vert sur un fichier vide** : on ne peut pas s'y fier pour savoir si vous avez écrit vos tests. Les titres des `it.todo` sont un plan, pas une obligation : vous pouvez en écrire d'autres, tant que chaque fichier compte au moins six tests et que le script de la section 08.8 est satisfait. La **couverture** de code, la mesure des lignes que les tests ont exécutées, est un autre indicateur : la section 08.9 la produit.

Installez enfin les deux paquets de l'étape, en dépendances de développement et en version exacte : le premier fournit `createTestingPinia`, le second le rapport de couverture. La version de `@vitest/coverage-v8` doit être **exactement** celle de Vitest (5.1.1).

```exec
cd ~/byte-layers/vue/shop && npm install -E -D @pinia/testing@2.0.2 @vitest/coverage-v8@5.1.1
```

```verify
D=~/byte-layers/vue/shop
for f in src/test/mount-component.ts src/test/mount-component.spec.ts src/test/handlers.ts src/features/auctions/useBidRules.spec.ts src/features/cart/CartPage.spec.ts src/router/navigation.spec.ts src/features/auctions/auctionFlow.spec.ts mutate.mjs E2E-SCENARIOS.md; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez les deux commandes cp de la section 08.1."; exit 1; }
done
grep -q 'createAppRouter' "$D/src/router/index.ts" || { echo "src/router/index.ts n'est pas la version fournie : relancez la première commande cp de la section 08.1."; exit 1; }
grep -q 'coverage' "$D/vite.config.ts" || { echo "vite.config.ts n'est pas la version fournie : relancez la seconde commande cp de la section 08.1."; exit 1; }
grep -q '"@pinia/testing": "2.0.2"' "$D/package.json" || { echo "@pinia/testing n'est pas fixé à 2.0.2 dans package.json : relancez la commande npm install de la section 08.1."; exit 1; }
grep -q '"@vitest/coverage-v8": "5.1.1"' "$D/package.json" || { echo "@vitest/coverage-v8 n'est pas fixé à 5.1.1 dans package.json : relancez la commande npm install de la section 08.1."; exit 1; }
[ -d "$D/node_modules/@pinia/testing" ] && [ -d "$D/node_modules/@vitest/coverage-v8" ] || { echo "Un paquet n'est pas installé dans node_modules : relancez la commande npm install de la section 08.1."; exit 1; }
echo "Les fichiers fournis sont en place, et les deux paquets sont installés."
```

## 08.2 - Quoi tester, et avec quel outil

Un bon test se place **à la bonne hauteur**. Trop bas, il répète le code ; trop haut, il est lent et dit mal où est la panne. Le lab choisit un outil par couche, et chaque outil est déjà dans le projet.

| Ce qu'on teste | L'outil | Votre fichier |
|---|---|---|
| une règle ou un composable, hors de tout écran | `withSetup` : exécute le composable dans un vrai composant | `useBidRules.spec.ts` |
| un composant et ses stores | `mountWithApp` avec `createTestingPinia` : les actions des stores sont des espions | `CartPage.spec.ts` |
| le routeur et sa garde | le vrai routeur, avec un historique en mémoire | `navigation.spec.ts` |
| un parcours : page, modale, cache, store, socket | `mountWithApp` et le faux socket | `auctionFlow.spec.ts` |
| les appels HTTP | MSW, un faux DummyJSON (déjà utilisé à l'étape 04) | fourni |

Trois principes tiennent l'ensemble.

- **On teste ce que l'utilisateur voit et fait**, pas la façon dont le code est écrit : le texte affiché, un lien, un appel au store. Dans les tests de ce lab, on cherche les éléments par leur `data-testid` (la liste est dans `AGENTS.md`, à la racine de l'application), parce qu'aucun outil de requête par rôle n'y est installé ; les scénarios de bout en bout de la section 08.10 partent, eux, du rôle et du nom accessible.
- **Le temps réel est joué par le test.** Le faux socket n'ouvre aucun port : il garde la trace de ce que l'application émet, et le test joue le serveur, avec `serverEmit` pour un événement, `ack(…)` pour la réponse à une offre. Aucun port, aucune donnée aléatoire, aucune dépendance au rythme du serveur : la suite entière tourne en une minute au plus. Les minuteries restent celles de l'environnement de test. Le vrai serveur reste validé à part, dans le navigateur ; les événements partagent des types avec lui, ce qui fait signaler à TypeScript une divergence de forme, sans remplacer un essai contre le vrai serveur.
- **Un test qui passe ne prouve rien tant qu'on n'a pas vu qu'il peut échouer.** C'est le rôle de la section 08.8.

Le faux socket se pilote avec ces gestes, que vous retrouverez dans le parcours d'enchère :

| Geste | Effet |
|---|---|
| `simulateConnect()` / `simulateDisconnect()` | le socket se connecte, ou le réseau tombe |
| `serverEmit('auction:bid', makeBid({ … }))` | le serveur envoie un événement à l'application |
| `emittedOf('auction:bid')` / `last('auction:bid')` | ce que l'application a émis, et son dernier envoi ; ses paramètres sont dans `.args` (`last('auction:bid').args[0]` est la charge utile de l'offre) |
| `last('auction:bid').ack?.({ ok: false, reason: 'outbid', price, version })` | le serveur répond à l'offre |
| `last('auction:bid').timeout?.()` | le serveur ne répond pas à temps |

> 📖 [Vue : tester une application](https://vuejs.org/guide/scaling-up/testing.html) · [Vue Test Utils : tester les composables](https://test-utils.vuejs.org/guide/advanced/reusability-composition) · [Vitest : `test.todo`](https://vitest.dev/api/#test-todo)

## 08.3 - Tester un composable : les règles d'une offre

Commençons par le plus simple : une règle sans écran. `useBidRules(auction)` (fichier `src/features/auctions/useBidRules.ts`) calcule l'offre minimale, qui est le prix courant plus un pas (`BID_STEP`, 5 €) arrondi à deux décimales, et `validate(montant)` renvoie un message d'erreur ou `null`. Le serveur reste juge ; ces règles préviennent l'utilisateur avant l'envoi. **Ouvrez ce fichier avant d'écrire** : les messages y sont.

Un composable qui utilise `ref`, `computed` ou `inject` doit tourner **dans un composant** : `withSetup(() => useBidRules(auction))` (`@/test/with-setup`, vu à l'étape 04) en monte un pour vous et renvoie `{ result, app, pinia, queryClient, unmount }` ; `result` est ce que le composable a rendu. Appelez `unmount()` en fin de test, pour libérer les effets. Les imports utiles : `makeAuction` de `@/test/auction-fixtures`, `ref` et `nextTick` de `vue`, `BID_STEP` et `useBidRules` de `./useBidRules`, le type `AuctionState` de `@/shared/events`.

Ouvrez `src/features/auctions/useBidRules.spec.ts`. Ses huit `it.todo` sont le plan.

**À vous** : écrivez au moins six des huit tests suivants (★ : celui que contrôle la section 08.8), puis retirez le commentaire d'introduction devenu inutile.

| Test | Ce qu'il faut asserter |
|---|---|
| ★ le minimum est le prix plus un pas | `makeAuction({ price: 450 })` : `result.minimum.value` vaut `450 + BID_STEP`, soit 455 |
| le minimum est réactif | on remplace `auction.value` par `makeAuction({ price: 480.5 })`, `await nextTick()`, le minimum vaut 485.5 |
| l'arrondi à deux décimales | prix 507.07 : en flottant, `507.07 + 5` donne `512.0699999999999` ; le minimum doit valoir exactement `512.07` (`toBe`) |
| le minimum exact est accepté | `validate(455)` et `validate(1000)` valent `null` |
| un montant trop bas est refusé | `validate(454.99)` correspond à `/Offre minimale : 455,00/` (le `€` suit une espace insécable : n'écrivez pas l'espace dans le test) ; `validate(450)` n'est pas `null` |
| un montant invalide est refusé | `validate(Number.NaN)` et `validate(Number.POSITIVE_INFINITY)` valent `'Saisissez un montant.'` |
| une enchère terminée est refusée | `makeAuction({ status: 'closed' })` : `validate(10_000)` vaut `'Cette enchère est terminée.'` |
| une enchère absente | avec `undefined` : `validate(500)` vaut `'Enchère introuvable.'` et le minimum de repli vaut `BID_STEP` |

Préférez une valeur exacte (`toBe`) à une assertion molle (« n'est pas nul ») dès que vous connaissez le résultat.

```hint
Une fabrique de montage évite de répéter le même code : `function setup(initial) { const auction = ref(initial); const mounted = withSetup(() => useBidRules(auction)); return { auction, ...mounted } }`. Pour tester la réactivité, changez `auction.value`, puis `await nextTick()` avant de relire `result.minimum.value`.
```

```hint
Les messages se testent avec une expression régulière (`toMatch(/Offre minimale : 455,00/)`) ou une valeur exacte (`toBe('Cette enchère est terminée.')`).
```

````solution
```ts
import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { withSetup } from '@/test/with-setup'
import { makeAuction } from '@/test/auction-fixtures'
import type { AuctionState } from '@/shared/events'
import { BID_STEP, useBidRules } from './useBidRules'

// Tests d'un composable avec withSetup : il tourne dans un vrai composant (inject, cycle de vie...).
function setup(initial: AuctionState | undefined) {
  const auction = ref<AuctionState | undefined>(initial)
  const mounted = withSetup(() => useBidRules(auction))
  return { auction, ...mounted }
}

describe('useBidRules', () => {
  it('l’offre minimale est le prix courant plus un pas', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.minimum.value).toBe(450 + BID_STEP)
    unmount()
  })

  it('le minimum suit le prix quand il change (réactif)', async () => {
    const { result, auction, unmount } = setup(makeAuction({ price: 450 }))
    auction.value = makeAuction({ price: 480.5 })
    await nextTick()
    expect(result.minimum.value).toBe(485.5)
    unmount()
  })

  it('arrondit à deux décimales (507.07 + 5 donne 512.0699999999999 en flottant)', () => {
    const { result, unmount } = setup(makeAuction({ price: 507.07 }))
    expect(result.minimum.value).toBe(512.07)
    unmount()
  })

  it('accepte le minimum exact et tout montant au-dessus', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.validate(455)).toBeNull()
    expect(result.validate(1000)).toBeNull()
    unmount()
  })

  it('refuse un montant sous le minimum, avec le minimum dans le message', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.validate(454.99)).toMatch(/Offre minimale : 455,00/)
    expect(result.validate(450)).not.toBeNull()
    unmount()
  })

  it('refuse un montant qui n’est pas un nombre', () => {
    const { result, unmount } = setup(makeAuction())
    expect(result.validate(Number.NaN)).toBe('Saisissez un montant.')
    expect(result.validate(Number.POSITIVE_INFINITY)).toBe('Saisissez un montant.')
    unmount()
  })

  it('enchère terminée : aucune offre n’est acceptable', () => {
    const { result, unmount } = setup(makeAuction({ status: 'closed' }))
    expect(result.validate(10_000)).toBe('Cette enchère est terminée.')
    unmount()
  })

  it('enchère absente : message dédié, minimum de repli', () => {
    const { result, unmount } = setup(undefined)
    expect(result.validate(500)).toBe('Enchère introuvable.')
    expect(result.minimum.value).toBe(BID_STEP)
    unmount()
  })
})
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/useBidRules.spec.ts"
grep -qE '^[[:space:]]*(it|test)\.todo\(' "$F" && { echo "useBidRules.spec.ts contient encore des it.todo : remplacez chacun par un vrai test (it('…', () => { … }))."; exit 1; }
N=$(grep -cE '^[[:space:]]*(it|test)(\.each)?\(' "$F")
[ "$N" -ge 6 ] || { echo "useBidRules.spec.ts compte $N test(s) : il en faut au moins 6."; exit 1; }
M=$(grep -cE 'expect\(' "$F")
[ "$M" -ge 6 ] || { echo "useBidRules.spec.ts contient trop peu d'assertions ($M lignes expect) : un test sans assertion ne vérifie rien."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/useBidRules.spec.ts >/dev/null 2>&1) || { echo "Un de vos tests échoue : lancez « npx vitest run src/features/auctions/useBidRules.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Un test qui échoue sur le code d'origine est mal écrit : vérifiez la valeur attendue."; exit 1; }
echo "Les règles d'une offre sont testées. La section 08.8 vérifiera que ces tests détectent un défaut."
```

> 📖 [Vue Test Utils : tester les composables](https://test-utils.vuejs.org/guide/advanced/reusability-composition)

## 08.4 - Le helper de montage : `mountWithApp`

Tous les tests de composants de l'application ont besoin de la même chose : une **application de test complète**, avec Pinia, TanStack Query, Vuetify, le routeur et le socket. Plutôt que de la reconstruire dans chaque fichier, vous écrivez un helper, `mountWithApp(component, options)`, qui la monte et rend de quoi l'inspecter. Voici les choix qu'il fait, et pourquoi :

| Choix | Pourquoi |
|---|---|
| `createTestingPinia({ createSpy: vi.fn, stubActions, initialState })` (de `@pinia/testing`) | les actions des stores deviennent des **espions** qui ne font rien par défaut : on teste « le bouton appelle `remove(2)` » sans exécuter `remove`. `stubActions: false` rend les vraies actions ; `initialState` remplit les stores avant le premier rendu |
| Vuetify comme plugin **global** du montage | un composant Vuetify a besoin de son plugin pour se rendre ; le mettre dans `global.plugins` évite de l'enregistrer composant par composant |
| un `QueryClient` de test (`createTestQueryClient()`) | pas de nouvelle tentative, pas d'attente inutile |
| le **vrai** routeur, `createAppRouter(createMemoryHistory())` | les vraies routes et la vraie garde, sans navigateur : l'historique est en mémoire |
| `await router.push(route)` puis `await router.isReady()` **avant** de monter | le composant se monte sur une route déjà résolue ; les pages sont chargées à la demande |
| le faux socket, fourni par `provide(auctionSocketKey, …)` | `useAuctionSocket` et `useBid` l'injectent : pas de réseau |
| `attachTo: document.body` | la modale est téléportée et le focus se teste : il faut un composant réellement dans le document |
| `await flushPromises()` après le montage | on rend la main une fois les promesses résolues |

Ouvrez `src/test/mount-component.ts`. Les types sont fournis, et la fonction jette `À écrire`. Son commentaire reprend la liste ci-dessus. Le helper rend `{ wrapper, router, pinia, queryClient, socket, notify, unmount }`.

**À vous** : écrivez `mountWithApp`, puis supprimez la première ligne du fichier (le commentaire `eslint-disable`).

**Critères :**

- le composant est rendu dans une application complète : Pinia de test, TanStack Query, Vuetify, `createNotify()` et la directive `countdown` ;
- la route de départ (`/home` par défaut) est respectée, avec la vraie garde ;
- les actions des stores sont espionnées et sans effet par défaut ; avec `stubActions: false` elles agissent ; `initialState` remplit les stores ;
- le faux socket est fourni à l'application, et un socket passé en option est celui qui est utilisé ;
- `unmount()` démonte le composant.

```hint
Le plugin Vuetify est `import vuetify from '@/plugins/vuetify'`. Les plugins vont dans un tableau : `[pinia, [VueQueryPlugin, { queryClient }], vuetify, notify, router]`. La directive se déclare dans `global.directives` (`{ countdown: vCountdown }`), le socket dans `global.provide` : `{ [auctionSocketKey as symbol]: socket.socket }`.
```

```hint
Les imports du helper : `createTestQueryClient` de `./with-setup`, `createNotify` de `@/plugins/notify`, `vCountdown` de `@/directives/countdown`, `createAppRouter` de `@/router`, `auctionSocketKey` de `@/features/auctions/auctionSocket`, `createMemoryHistory` de `vue-router`, `createTestingPinia` de `@pinia/testing`, `vi` de `vitest`. Le faux socket vient de `createFakeSocket()` (`./fake-socket`) : l'objet rendu porte `socket`, le socket typé à fournir, et les gestes de pilotage. `mount` et `flushPromises` viennent de `@vue/test-utils`.
```

````solution
```ts
import { vi } from 'vitest'
import type { Component } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { createNotify } from '@/plugins/notify'
import { vCountdown } from '@/directives/countdown'
import { createAppRouter } from '@/router'
import { auctionSocketKey } from '@/features/auctions/auctionSocket'
import { createFakeSocket, type FakeSocket } from './fake-socket'
import { createTestQueryClient } from './with-setup'

export interface MountWithAppOptions {
  /** Route de départ du routeur (en mémoire). `/home` par défaut. */
  route?: string
  props?: Record<string, unknown>
  /** État initial des stores, par identifiant : `{ cart: { items: [...] }, auth: { session: {...} } }`. */
  initialState?: Record<string, unknown>
  /** `true` (défaut) : les actions des stores sont des espions qui ne font rien ; `false` : les vraies actions. */
  stubActions?: boolean
  /** Un faux socket déjà créé (pour le piloter depuis le test). */
  socket?: FakeSocket
}

/**
 * Monte un composant dans une application COMPLÈTE de test : Pinia de test, TanStack Query, Vuetify, le plugin
 * de notifications, la directive `v-countdown`, le VRAI routeur (historique en mémoire, vraies routes et garde)
 * et un faux socket fourni par `provide`. Appelez `unmount()` en fin de test.
 */
export async function mountWithApp(component: Component, options: MountWithAppOptions = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: options.stubActions ?? true,
    initialState: options.initialState,
  })
  const queryClient = createTestQueryClient()
  const router = createAppRouter(createMemoryHistory())
  const socket = options.socket ?? createFakeSocket()
  const notify = createNotify()

  await router.push(options.route ?? '/home')
  await router.isReady()

  const wrapper: VueWrapper = mount(component, {
    attachTo: document.body,
    props: options.props,
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }], vuetify, notify, router],
      directives: { countdown: vCountdown },
      provide: { [auctionSocketKey as symbol]: socket.socket },
    },
  })
  await flushPromises()

  return { wrapper, router, pinia, queryClient, socket, notify, unmount: () => wrapper.unmount() }
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/test/mount-component.ts"
grep -q 'À écrire' "$F" && { echo "mount-component.ts contient encore « À écrire » : écrivez mountWithApp."; exit 1; }
head -1 "$F" | grep -q 'eslint-disable' && { echo "Supprimez la première ligne de mount-component.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/test/mount-component.spec.ts >/dev/null 2>&1) || { echo "Les tests du helper échouent : lancez « npx vitest run src/test/mount-component.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il nomme l'élément manquant : Vuetify, route de départ, garde, actions des stores, état initial, socket ou plugin de notifications."; exit 1; }
echo "Le helper monte une application de test complète."
```

> 📖 [Pinia : tester les stores](https://pinia.vuejs.org/cookbook/testing.html) · [Vue Test Utils : Teleport](https://test-utils.vuejs.org/guide/advanced/teleport)

## 08.5 - Tester un composant avec `createTestingPinia` : la page du panier

La page du panier lit le store `cart` et lui demande des actions : « + », « − », la corbeille, « Vider le panier ». On teste donc deux choses : ce qui est **affiché** à partir de l'état du store, et **ce que les boutons demandent** au store. Avec `mountWithApp`, l'état vient de `initialState: { cart: { items } }`, et les actions sont des espions : `expect(cart.remove).toHaveBeenCalledWith(2)`. Ouvrez `src/features/cart/pages/CartPage.vue` pour voir son gabarit, et `src/features/cart/CartPage.spec.ts` pour écrire.

Les imports : `mountWithApp` de `@/test/mount-component`, `useCartStore` de `./cartStore`, `CartPage` de `./pages/CartPage.vue`. On obtient le store avec `useCartStore(mounted.pinia)`. Deux lignes de panier pour les tests : `{ id: 1, title: 'Mug', price: 12.5, thumbnail: 'mug.png', quantity: 2 }` et `{ id: 2, title: 'Lampe', price: 30, thumbnail: 'lamp.png', quantity: 1 }`. Pensez à `unmount()` dans un `afterEach`.

Un point sur les montants : la page les formate avec `Intl.NumberFormat('fr-FR', …)`, qui place une **espace insécable** (U+00A0) avant le `€`. Un test écrit `toBe('55,00 €')` avec une espace normale échoue sans que rien ne le laisse deviner : cherchez `55,00` avec une expression régulière, ou comparez après `.replace(/\s/g, ' ')`.

**À vous** : écrivez au moins six des huit tests suivants (★ : celui que contrôle la section 08.8).

| Test | Ce qu'il faut asserter |
|---|---|
| panier vide | `cart-empty` existe, `cart-total` n'existe pas, et le lien `[data-testid="cart-empty"] a` a pour `href` `/products` |
| une ligne par produit | deux `cart-item` ; le texte de la première contient `Mug` ; son `cart-item-qty` vaut `2` |
| le total | `cart-total` contient `55,00` (2 × 12,50 + 30) |
| « + » | `cart-item-increase` d'une ligne de quantité 2 : `cart.setQuantity` est appelé avec `(1, 3)` |
| « − » | `cart-item-decrease` : `setQuantity` est appelé avec `(1, 1)` |
| ★ la corbeille | avec les deux lignes, `cart-item-remove` de la **deuxième** : `cart.remove` est appelé **une fois**, avec `2` |
| vider le panier | `cart-clear` : `cart.clear` est appelé une fois |
| passer commande | `cart-checkout` a pour `href` `/checkout` |

```hint
Le test de la corbeille doit pouvoir **échouer** si on se trompe de ligne : cliquez sur la corbeille de la seconde, et vérifiez à la fois `toHaveBeenCalledTimes(1)` et `toHaveBeenCalledWith(2)`.
```

```hint
`await wrapper.get('[data-testid="cart-item-increase"]').trigger('click')` clique et attend le rendu. Un lien se vérifie par son attribut : `.attributes('href')`.
```

````solution
Le montage et trois des huit tests ; les cinq autres suivent le même modèle.

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { mountWithApp } from '@/test/mount-component'
import { useCartStore } from './cartStore'
import CartPage from './pages/CartPage.vue'

// createTestingPinia (dans mountWithApp) : les stores sont remplis par `initialState`, leurs actions sont des espions.
const mug = { id: 1, title: 'Mug', price: 12.5, thumbnail: 'mug.png', quantity: 2 }
const lamp = { id: 2, title: 'Lampe', price: 30, thumbnail: 'lamp.png', quantity: 1 }

let cleanup: (() => void) | undefined
afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

async function mountCart(items: unknown[]) {
  const mounted = await mountWithApp(CartPage, { initialState: { cart: { items } } })
  cleanup = mounted.unmount
  return { ...mounted, cart: useCartStore(mounted.pinia) }
}

const rows = (wrapper: Awaited<ReturnType<typeof mountCart>>['wrapper']) =>
  wrapper.findAll('[data-testid="cart-item"]')

describe('CartPage', () => {
  it('panier vide : message et lien vers le catalogue, pas de total', async () => {
    const { wrapper } = await mountCart([])
    expect(wrapper.find('[data-testid="cart-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cart-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cart-empty"] a').attributes('href')).toBe('/products')
  })

  // … d'autres tests, sur le même modèle …

  it('« + » demande une unité de plus au store', async () => {
    const { wrapper, cart } = await mountCart([mug])
    await rows(wrapper)[0]!.get('[data-testid="cart-item-increase"]').trigger('click')
    expect(cart.setQuantity).toHaveBeenCalledWith(1, 3)
  })

  // … d'autres tests, sur le même modèle …

  it('la corbeille retire LA ligne cliquée, pas une autre', async () => {
    const { wrapper, cart } = await mountCart([mug, lamp])
    await rows(wrapper)[1]!.get('[data-testid="cart-item-remove"]').trigger('click')
    expect(cart.remove).toHaveBeenCalledTimes(1)
    expect(cart.remove).toHaveBeenCalledWith(2)
  })

  // … d'autres tests, sur le même modèle …
})
```

Le fichier complet : [`CartPage.spec.ts`](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/08/src/features/cart/CartPage.spec.ts).
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/cart/CartPage.spec.ts"
grep -qE '^[[:space:]]*(it|test)\.todo\(' "$F" && { echo "CartPage.spec.ts contient encore des it.todo : remplacez chacun par un vrai test."; exit 1; }
N=$(grep -cE '^[[:space:]]*(it|test)(\.each)?\(' "$F")
[ "$N" -ge 6 ] || { echo "CartPage.spec.ts compte $N test(s) : il en faut au moins 6."; exit 1; }
M=$(grep -cE 'expect\(' "$F")
[ "$M" -ge 6 ] || { echo "CartPage.spec.ts contient trop peu d'assertions ($M lignes expect) : un test sans assertion ne vérifie rien."; exit 1; }
(cd "$D" && npx vitest run src/features/cart/CartPage.spec.ts >/dev/null 2>&1) || { echo "Un de vos tests échoue : lancez « npx vitest run src/features/cart/CartPage.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message."; exit 1; }
echo "La page du panier est testée : affichage et demandes au store."
```

> 📖 [Pinia : tester les composants](https://pinia.vuejs.org/cookbook/testing.html)

## 08.6 - Tester la navigation : le routeur et sa garde

La garde d'authentification est une règle de sécurité : elle mérite des tests, avec les **vraies routes** et la **vraie garde**. `createAppRouter(createMemoryHistory())` (de `@/router` et de `vue-router`) les donne, sans navigateur. On navigue avec `router.push(chemin)`, puis `await flushPromises()` (de `@vue/test-utils`) pour laisser les pages chargées à la demande se résoudre, et on lit `router.currentRoute.value` (`name`, `fullPath`, `query`, `params`).

Deux pièges. **`router.push` est asynchrone** : lire la route avant d'avoir attendu donne l'ancienne. Et **la garde lit la session au moment de la navigation** : la session doit être posée **avant** le `push`, dans le store d'authentification (`useAuthStore` de `@/features/auth/authStore`), avec un Pinia actif : `setActivePinia(createPinia())` (de `pinia`), `localStorage.clear()` pour partir d'un état propre, puis `useAuthStore().session = { accessToken: 'a', refreshToken: 'r', user: { id: 1, username: 'emilys', firstName: 'Emily', lastName: 'Johnson', image: '' } }`. La route protégée utilisée ici est `/account`. Les paramètres d'une route sont des chaînes : `route.params.id` vaut `'42'`.

Ouvrez `src/router/navigation.spec.ts`.

**À vous** : écrivez au moins six des tests suivants (★ : celui que contrôle la section 08.8). Si les titres des `it.todo` en citent d'autres, ils sont facultatifs.

| Test | Ce qu'il faut asserter |
|---|---|
| `/` redirige vers `/home` | `fullPath` vaut `/home` |
| une page publique est ouverte sans session | `/products` : `name` vaut `products` |
| ★ `/account` sans session | `name` vaut `login` et `query.redirect` vaut `/account` (`fullPath` : `/login?redirect=/account`) |
| avec une session, `/account` est ouvert | `name` vaut `account` |
| avec une session, `/login` renvoie à l'accueil | `name` vaut `home` |
| la garde relit la session à chaque navigation | session posée, `/account` ouvert ; puis `auth.logout()`, puis `/account` : `name` vaut `login` |
| une fiche produit | `/products/42` : `name` vaut `product`, `params.id` vaut `'42'` |
| un identifiant non numérique | `/products/abc` : `name` vaut `not-found` ; une adresse inconnue donne aussi `not-found` |

```hint
Une fonction `setup(signedIn)` qui prépare Pinia, la session et le routeur, et rend une fonction `go(path)` qui fait `await router.push(path)`, `await flushPromises()` et rend la route courante, rend chaque test court.
```

````solution
Le montage et trois tests ; les autres suivent le même modèle.

```ts
import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/features/auth/authStore'

// Le VRAI routeur (routes, garde) avec un historique en mémoire ; la session est posée dans le store d'authentification.
function setup(signedIn: boolean) {
  setActivePinia(createPinia())
  localStorage.clear()
  const auth = useAuthStore()
  if (signedIn) {
    auth.session = {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 1, username: 'emilys', firstName: 'Emily', lastName: 'Johnson', image: '' },
    }
  }
  const router = createAppRouter(createMemoryHistory())
  const go = async (path: string) => {
    await router.push(path)
    await flushPromises()
    return router.currentRoute.value
  }
  return { router, go, auth }
}

describe('navigation (router.push + flushPromises)', () => {
  it('« / » redirige vers /home', async () => {
    const { go } = setup(false)
    expect((await go('/')).fullPath).toBe('/home')
  })

  it('une page publique est accessible sans session', async () => {
    const { go } = setup(false)
    expect((await go('/products')).name).toBe('products')
  })

  it('/account sans session : redirection vers /login avec l’adresse demandée', async () => {
    const { go } = setup(false)
    const route = await go('/account')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/account')
  })

  // … sept autres tests, sur le même modèle …
})
```

Le fichier complet : [`navigation.spec.ts`](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/08/src/router/navigation.spec.ts).
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/router/navigation.spec.ts"
grep -qE '^[[:space:]]*(it|test)\.todo\(' "$F" && { echo "navigation.spec.ts contient encore des it.todo : remplacez chacun par un vrai test."; exit 1; }
N=$(grep -cE '^[[:space:]]*(it|test)(\.each)?\(' "$F")
[ "$N" -ge 6 ] || { echo "navigation.spec.ts compte $N test(s) : il en faut au moins 6."; exit 1; }
M=$(grep -cE 'expect\(' "$F")
[ "$M" -ge 6 ] || { echo "navigation.spec.ts contient trop peu d'assertions ($M lignes expect) : un test sans assertion ne vérifie rien."; exit 1; }
(cd "$D" && npx vitest run src/router/navigation.spec.ts >/dev/null 2>&1) || { echo "Un de vos tests échoue : lancez « npx vitest run src/router/navigation.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Pensez à attendre flushPromises après router.push, et à poser la session avant la navigation."; exit 1; }
echo "La navigation et sa garde sont testées."
```

> 📖 [Vue Router : gardes de navigation](https://router.vuejs.org/guide/advanced/navigation-guards.html)

## 08.7 - Tester le parcours d'enchère : offre, surenchère, refus

C'est le test le plus riche, et il tient à une idée : **l'offre optimiste doit se défaire sans écraser ce qui est arrivé entre-temps.** Reprenons ce que fait `useBid` (étape 05). Vous offrez 500 € alors que l'enchère est à 450 € (version 0) : le prix affiché monte tout de suite à 500 €, sans toucher à `version`. Pendant que votre offre est en vol, un autre enchérisseur passe à 480 € : le serveur traite son offre d'abord, l'événement `auction:bid` arrive (version 1), puis il répond **`outbid`** à la vôtre. Si l'application revenait aveuglément au prix d'avant votre offre (450 €), elle effacerait l'offre de l'autre. La règle est donc : on ne revient à l'état d'avant que si `version` n'a pas avancé ; sinon l'événement du serveur, plus récent, fait foi.

Le test joue le serveur. Il monte la page avec les vraies actions des stores (`stubActions: false`), connecte le faux socket, envoie la liste des enchères, ouvre la modale de l'iPhone, saisit un montant, et pilote la suite avec `serverEmit` et `ack`. Trois particularités :

- La modale est **téléportée** dans `#modals`, hors du composant monté : on la cherche dans le document (`document.body.querySelector`), pas dans le `wrapper`. Le fichier `src/test/setup.ts` recrée `#modals` avant chaque test, donc vider `document.body` dans un `afterEach` est sans danger.
- La modale est un composant asynchrone depuis l'étape 07 : `flushPromises` ne rend la main qu'après les promesses déjà résolues, ce qui ne suffit pas pour un module chargé à la demande. `vi.waitFor(callback)` (de `vitest`) rejoue la fonction jusqu'à ce qu'elle ne lève plus d'erreur (au plus une seconde par défaut) : `await vi.waitFor(() => expect(byId('auction-modal')).not.toBeNull())`.
- Ouvrez `src/features/auctions/components/AuctionModal.vue` et `src/features/auctions/useBid.ts` : les textes affichés y sont, et le tableau ci-dessous les reprend.

Les données : `makeAuctionList()`, `makeAuction()` et `makeBid()` (de `@/test/auction-fixtures`) fabriquent les enchères et les offres ; `AuctionsPage` vient de `./pages/AuctionsPage.vue`, `mountWithApp` de `@/test/mount-component`. La liste contient cinq enchères, dont la **première est l'iPhone 13 Pro, `productId: 123`**, à 450 € : le premier `auction-card-open` du document ouvre sa modale. Les enchères de la liste sont 123, 78, 94, 101 et 174.

Les sélecteurs (zones `auctions`, `auction-card` et `auction-modal` de `AGENTS.md`) : `auction-card-open`, `auction-modal`, `auction-modal-amount` (la racine du champ : l'`input` est dedans), `auction-modal-submit`, `auction-modal-price`, `auction-modal-leader`, `auction-modal-error`, `auction-modal-live`, `auction-modal-closed`, `bid-history`, `auctions-offline`. Les textes et le prix se comparent après avoir normalisé les espaces (`.replace(/\s+/g, ' ')`), ou avec une expression régulière : le `€` suit une espace insécable.

Ouvrez `src/features/auctions/auctionFlow.spec.ts`.

**À vous** : écrivez d'abord deux fonctions d'aide, une qui amène la modale de l'iPhone à l'écran, une qui saisit un montant et envoie l'offre, puis au moins six des huit tests suivants (★ : ceux que contrôle la section 08.8).

| Test | Ce qu'il faut asserter |
|---|---|
| l'offre part, le prix monte | après une offre de 500 : `socket.last('auction:bid').args[0]` vaut `{ productId: 123, amount: 500, bidder: 'invité', expectedVersion: 0 }` ; `auction-modal-price` contient `500,00` **avant** toute réponse ; `auction-modal-leader` contient `invité` |
| offre acceptée | `last('auction:bid').ack?.({ ok: true, price: 500, version: 1 })`, puis `serverEmit('auction:bid', makeBid({ price: 500, version: 1, bidder: 'invité' }))` : le prix reste `500,00`, `bid-history` contient `invité`, `auction-modal-error` n'existe pas |
| ★ refus `too-low` | `ack?.({ ok: false, reason: 'too-low', price: 450, version: 0 })` : le prix **revient** à `450,00`, `auction-modal-leader` contient `Aucune offre`, `auction-modal-error` contient `trop basse` |
| `outbid` | d'abord `serverEmit('auction:bid', makeBid({ price: 480, version: 1, bidder: 'bruno-bot' }))`, **puis** `ack?.({ ok: false, reason: 'outbid', price: 480, version: 1 })` : le prix est `480,00` (ni 450, ni 500), le meneur est `bruno-bot`, `auction-modal-error` contient `avant vous` |
| l'annonce `aria-live` | après ma prise de tête (acceptée + événement), `serverEmit('auction:bid', makeBid({ price: 510, version: 2, bidder: 'chloe-bot' }))` : `auction-modal-live` a `aria-live="polite"` et contient `Vous êtes surenchéri : chloe-bot a offert 510,00` |
| délai dépassé | `last('auction:bid').timeout?.()` : le prix revient à `450,00`, l'erreur contient `pas répondu` |
| ★ perte puis retour de connexion | `socket.emitted.length = 0`, `simulateDisconnect()` : `auctions-offline` existe ; `simulateConnect()` : il disparaît et `emittedOf('auction:join').map((e) => e.args[0])` vaut `[123, 78, 94, 101, 174]` ; en réponse au premier `join` (`.ack?.(makeAuction({ productId: 123, price: 620, version: 7, leader: 'alice-bot' }))`), le prix affiché est `620,00` |
| enchère terminée | `serverEmit('auction:closed', makeAuction({ price: 450, version: 0, status: 'closed' }))` : `auction-modal-closed` existe et `auction-modal-submit` n'existe plus |

```hint
Une fonction `openIphone()` monte la page avec `mountWithApp(AuctionsPage, { route: '/auctions', stubActions: false })`, appelle `socket.simulateConnect()`, `socket.serverEmit('auction:list', makeAuctionList())`, attend un tour (`await flushPromises()`), clique sur le premier `auction-card-open`, et attend la modale avec `vi.waitFor`. Pour saisir un montant, écrivez dans l'`input` du champ puis envoyez un événement `input` : `input.value = '500'; input.dispatchEvent(new Event('input'))`.
```

```hint
Le test `outbid` suit ce scénario : l'offre part (attendez `socket.emittedOf('auction:bid')` avec `vi.waitFor`) ; le test émet **d'abord** l'offre de l'autre, **puis** répond au refus. Les lectures de l'erreur et du prix se font avec `await vi.waitFor(…)` : le refus arrive de façon asynchrone.
```

````solution
Les fonctions d'aide et deux tests, dont le plus important ; les autres suivent le même modèle.

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { makeAuction, makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { mountWithApp } from '@/test/mount-component'
import AuctionsPage from './pages/AuctionsPage.vue'

// Parcours complet « enchère -> outbid -> rollback » : la page, la modale, le cache, le store et le faux socket ensemble.
// Le serveur est joué par le test : `socket.serverEmit(...)` pour les événements, `ack(...)` pour la réponse à une offre.
let cleanup: (() => void) | undefined
afterEach(() => {
  cleanup?.()
  cleanup = undefined
  document.body.innerHTML = ''
})

const byId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const text = (id: string) => byId(id)?.textContent?.replace(/\s+/g, ' ').trim()

/** Page des enchères montée, liste reçue, modale de l'iPhone ouverte. */
async function openIphone() {
  const mounted = await mountWithApp(AuctionsPage, { route: '/auctions', stubActions: false })
  cleanup = mounted.unmount
  const { socket } = mounted
  socket.simulateConnect()
  socket.serverEmit('auction:list', makeAuctionList())
  await flushPromises()
  byId('auction-card-open')?.click()
  await vi.waitFor(() => expect(byId('auction-modal')).not.toBeNull())
  return mounted
}

/** Tape un montant dans le champ de la modale et envoie l'offre. */
async function bid(amount: number, socket: Awaited<ReturnType<typeof openIphone>>['socket']) {
  const input = byId('auction-modal-amount')!.querySelector('input') as HTMLInputElement
  input.value = String(amount)
  input.dispatchEvent(new Event('input'))
  await flushPromises()
  byId('auction-modal-submit')?.click()
  await vi.waitFor(() => expect(socket.emittedOf('auction:bid')).toHaveLength(1))
}

describe('parcours enchère', () => {
  it('refus « too-low » : rollback du prix, message d’erreur', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    socket.last('auction:bid').ack?.({ ok: false, reason: 'too-low', price: 450, version: 0 })
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(text('auction-modal-price')).toMatch(/450,00/)
    expect(text('auction-modal-leader')).toContain('Aucune offre')
    expect(text('auction-modal-error')).toContain('trop basse')
  })

  it('outbid : l’offre de l’autre arrive d’abord, le refus ne la fait pas reculer', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    // pendant que mon offre est en vol, quelqu'un d'autre passe à 480 (le serveur traite dans l'ordre)
    socket.serverEmit('auction:bid', makeBid({ price: 480, version: 1, bidder: 'bruno-bot' }))
    socket.last('auction:bid').ack?.({ ok: false, reason: 'outbid', price: 480, version: 1 })
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(text('auction-modal-error')).toContain('avant vous')
    expect(text('auction-modal-price')).toMatch(/480,00/) // pas 450 (rollback aveugle), pas 500 (optimiste)
    expect(text('auction-modal-leader')).toContain('bruno-bot')
    expect(text('bid-history')).toContain('bruno-bot')
  })

  // … d'autres tests, sur le même modèle …
})
```

Le fichier complet : [`auctionFlow.spec.ts`](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/08/src/features/auctions/auctionFlow.spec.ts).
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/auctionFlow.spec.ts"
grep -qE '^[[:space:]]*(it|test)\.todo\(' "$F" && { echo "auctionFlow.spec.ts contient encore des it.todo : remplacez chacun par un vrai test."; exit 1; }
N=$(grep -cE '^[[:space:]]*(it|test)(\.each)?\(' "$F")
[ "$N" -ge 6 ] || { echo "auctionFlow.spec.ts compte $N test(s) : il en faut au moins 6."; exit 1; }
M=$(grep -cE 'expect\(' "$F")
[ "$M" -ge 6 ] || { echo "auctionFlow.spec.ts contient trop peu d'assertions ($M lignes expect) : un test sans assertion ne vérifie rien."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/auctionFlow.spec.ts >/dev/null 2>&1) || { echo "Un de vos tests échoue : lancez « npx vitest run src/features/auctions/auctionFlow.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. La modale est téléportée et asynchrone : cherchez-la dans document.body, avec vi.waitFor."; exit 1; }
echo "Le parcours d'enchère est testé, refus et surenchère compris."
```

> 📖 [Vitest : `vi.waitFor`](https://vitest.dev/api/vi.html#vi-waitfor) · [Vue Test Utils : Teleport](https://test-utils.vuejs.org/guide/advanced/teleport) · [Vue Test Utils : transitions](https://test-utils.vuejs.org/guide/advanced/transitions)

## 08.8 - Vos tests valent-ils quelque chose ? Les mutations

Un test qui passe peut ne rien vérifier : une assertion trop vague, un cas oublié. Le moyen de le savoir est de **casser le code exprès** et de regarder si un test s'en aperçoit. Une petite altération du code de l'application s'appelle une **mutation** ; un test qui échoue dessus la **tue** ; une mutation qui passe inaperçue **survit**, et cela signifie qu'aucun de vos tests ne protège ce comportement.

Le script fourni `mutate.mjs` (à la racine de l'application, sans dépendance : Node et Vitest) travaille en trois temps :

1. il refuse l'état vide et ce qui ressemble à de la triche : pas de `it.todo`, pas de test désactivé (`.skip`), pas de `.only`, et au moins six tests dans chacun de vos quatre fichiers ;
2. il lance vos tests sur le code tel quel : ils doivent tous passer ;
3. il applique cinq mutations, une par une, et pour chacune ne relance que le **fichier de test nommé** dans le tableau. La mutation est tuée si au moins un test de ce fichier est signalé en échec, et il **restaure** le fichier de l'application aussitôt, même après une erreur ou un `Ctrl+C`.

Deux précisions sur ce que le script compte. Un fichier de test qui ne se charge plus (une erreur à l'import) ne compte pas comme un test en échec : la mutation survit, et c'est à vous d'écrire une assertion. Et il affiche deux sortes de problèmes : **`ECHEC`**, un défaut de vos fichiers (un `it.todo`, moins de six tests, un test qui échoue sur le code d'origine, un fichier introuvable, une mutation inapplicable parce que le fichier de l'application a changé) ; **`SURVIT`**, une mutation que vos tests n'ont pas vue.

Voici, pour chaque mutation, ce qu'elle change et **l'assertion qui la tue** :

| Mutation (fichier de test) | Ce qu'il faut asserter |
|---|---|
| l'offre minimale n'ajoute plus le pas (`useBidRules.spec.ts`) | que le minimum vaut le prix **plus** `BID_STEP` (450 donne 455), pas seulement « un nombre » |
| la corbeille vide tout le panier au lieu de retirer la ligne (`CartPage.spec.ts`) | que `cart.remove` est appelé avec l'`id` de la ligne cliquée ; la mutation appelle `clear` à la place |
| la garde laisse passer les routes protégées (`navigation.spec.ts`) | qu'une route protégée (`/account`) sans session mène à `login` |
| une offre refusée n'est plus annulée (`auctionFlow.spec.ts`) | qu'après un refus le prix **revient** au prix d'avant l'offre (450,00) |
| après une reconnexion, on ne rejoint plus les enchères (`auctionFlow.spec.ts`) | qu'après `simulateConnect()` le faux socket a reçu un `auction:join` pour chaque enchère |

Faites d'abord l'expérience à la main sur la première ligne. Dans `src/features/auctions/useBidRules.ts`, repérez dans `minimum` la ligne qui calcule le prix plus le pas, et supprimez-y le pas (gardez seulement le prix). Lancez `npx vitest run src/features/auctions/useBidRules.spec.ts` : au moins un de vos tests doit passer au rouge. **Revenez ensuite au code d'origine** avec `git checkout -- src/features/auctions/useBidRules.ts` (le dépôt git de l'application date de l'étape 01 ; si vous aviez des modifications non committées dans ce fichier, remettez la ligne à la main). Si le fichier reste modifié, le script le détecte (« mutation inapplicable ») et refuse de continuer.

Lancez maintenant le contrôle complet avec le bouton ci-dessous (de l'ordre de la minute : il démarre Vitest une fois pour vos tests, puis une fois par mutation). Il affiche pour chaque mutation « tuée » ou « SURVIT », et se termine par `MUTATION OK : 5 mutations détectées sur 5` quand tout est conforme. Devant un `SURVIT`, ajoutez dans le fichier de test nommé l'assertion du tableau, et relancez.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && node mutate.mjs) || { echo "Le contrôle des mutations a échoué : lisez les lignes ECHEC et SURVIT ci-dessus. ECHEC : un défaut de vos fichiers (it.todo, moins de six tests, test en échec, fichier de l'application modifié) ; SURVIT : une mutation que vos tests ne voient pas, voir le tableau de la section 08.8 pour l'assertion qui la tue."; exit 1; }
echo "Vos tests passent, et ils détectent les cinq mutations du script."
```

Le script modifie des fichiers sources pendant qu'il tourne. N'enregistrez rien dans l'éditeur à ce moment-là, et ne le lancez pas deux fois en parallèle.

## 08.9 - Les commandes de qualité

Quatre commandes disent si l'application est dans un état livrable. Le lab n'a pas de pipeline d'intégration continue : ces commandes sont la barrière de qualité, à lancer à la main avant de dire qu'un travail est fini.

| Commande | Ce qu'elle contrôle |
|---|---|
| `npm run type-check` | `vue-tsc --build` : les fichiers `.vue` et `.ts`, tests compris |
| `npm run lint` | `eslint .` |
| `npm test` | Vitest, une seule passe : toute la suite |
| `npm test -- --coverage` | les mêmes tests, avec un rapport de couverture (V8) : quelles lignes du code les tests ont exécutées |

Le bouton ci-dessous lance les trois premières, dans l'ordre, et s'arrête à la première qui échoue (de l'ordre de la minute en tout). Sur la solution du kit, la suite compte 243 tests : les 201 d'avant, les 8 du helper et les 34 des quatre fichiers que vous écrivez. Avec six tests par fichier, votre total est d'au moins 233.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur. Dans un test, un import manquant ou une valeur du mauvais type en est la cause habituelle."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Un import devenu inutile (describe, it, vi) dans vos tests est la cause habituelle."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent."
```

Le rapport de couverture se lit comme un indice, pas comme un objectif : un pourcentage haut avec des assertions vagues ne prouve rien, et c'est justement ce que les mutations contrôlent. Le bouton suivant le produit : la ligne « All files » donne les pourcentages de l'ensemble de l'application (de l'ordre de 87 % des lignes sur la solution du kit), et un rapport détaillé par fichier est écrit dans `coverage/`, un dossier que git ignore.

```verify
D=~/byte-layers/vue/shop
OUT=$(cd "$D" && npm test -- --coverage 2>&1)
RC=$?
[ "$RC" -eq 0 ] || { echo "npm test -- --coverage échoue : lancez la commande dans ~/byte-layers/vue/shop. Si le message cite @vitest/coverage-v8, sa version doit être exactement celle de Vitest (5.1.1) : relancez la commande npm install de la section 08.1."; exit 1; }
echo "$OUT" | grep 'All files' || { echo "Le rapport de couverture ne contient pas la ligne « All files » : relancez la commande et lisez sa sortie."; exit 1; }
echo "Le rapport de couverture est produit (dossier coverage/)."
```

> 📖 [Vitest : couverture](https://vitest.dev/guide/coverage)

## 08.10 - Préparer la session de bout en bout

Les tests d'une autre hauteur, ceux d'un vrai navigateur qui parcourt l'application contre le vrai serveur, sont l'objet d'une **autre session** (à venir), avec Playwright. **Playwright n'est pas installé dans ce lab.** Ce que l'application a posé tout au long de la journée sert à cette session, et deux fichiers fournis la préparent :

- **`E2E-SCENARIOS.md`**, à la racine de l'application : cinq scénarios écrits (préparation, gestes, vérifications, sélecteurs : rôle et nom accessible d'abord, `data-testid` ensuite). Ils n'ont pas été exécutés avec Playwright ; leurs comportements ont été vérifiés à la main dans un navigateur contre le vrai serveur, et par les tests Vitest du dépôt.
- **`src/test/handlers.ts`** : des handlers MSW réutilisables, qui décrivent le contrat de DummyJSON pour les tests et, en E2E, pour forcer une panne.

| Scénario | Ce qu'il vérifie |
|---|---|
| 1 | panier : ajout, quantité, suppression, total |
| 2 | le panier survit au rechargement (`localStorage`, clé `shop.cart`), y compris stockage corrompu |
| 3 | la commande est bloquée sans connexion, puis le formulaire de commande (option de l'étape 06) |
| 4 | enchère : un bot surenchérit (`POST /control/bot-bid`), l'annonce `aria-live` est émise |
| 5 | enchère : le serveur refuse, l'offre optimiste est annulée de façon visible |

Le scénario 5 demande un serveur lancé avec un **pas de 10 €** alors que le client croit qu'il est de 5 : l'offre minimale proposée (455) est refusée (`too-low`), sans course entre deux clients, donc de façon déterministe. Il se lance ainsi : `BID_STEP=10 BOTS=off npm start` dans `~/byte-layers/vue/course/kit/server`, puis `POST /control/reset` avant chaque scénario d'enchère. Les handlers MSW sont ceux-ci :

| Export | Rôle |
|---|---|
| `handlers`, `productAndCartHandlers` | catalogue, recherche, catégories, fiche produit, ajout au panier |
| `authHandlers` | connexion, session courante, renouvellement du jeton |
| `allHandlers` | les deux ensemble |
| `failures.cartAdd`, `failures.products`, `failures.login` | un refus ou une panne ciblés, à brancher avec `server.use(…)` |

Dans Vitest, `server.use(failures.cartAdd(500))` force l'échec d'un ajout au panier (voir `useAddToCart.spec.ts`). Ouvrez `E2E-SCENARIOS.md` et lisez-le en entier : c'est le point de départ de la session suivante.

```acknowledge
J'ai lu les cinq scénarios de E2E-SCENARIOS.md et je sais que le scénario 5 demande un serveur lancé avec BID_STEP=10
```

> 📖 [Playwright](https://playwright.dev/) · [MSW](https://mswjs.io/docs/)

## 08.11 - Récap

Ce que l'étape vous laisse :

- Un test se place **à la bonne hauteur** : `withSetup` pour un composable, `mountWithApp` et `createTestingPinia` pour un composant et ses stores, le vrai routeur en mémoire pour la navigation, un faux socket joué par le test pour le temps réel.
- Le parcours d'enchère teste le cas qui compte : l'offre d'un autre arrive **avant** le refus de la vôtre, et le retour en arrière ne l'écrase pas.
- Un test qui passe ne suffit pas : `node mutate.mjs` casse cinq endroits du code, un par un, et vérifie que le fichier de test concerné le voit.
- `npm run type-check`, `npm run lint`, `npm test` et `npm test -- --coverage` sont la barrière de qualité. Aucun pipeline d'intégration continue n'est branché dans ce lab.
- `E2E-SCENARIOS.md` et les handlers MSW préparent la session de bout en bout.

Et la journée, étape par étape. Vous avez construit une boutique qui reste juste quand le serveur lui parle :

| Étape | Ce que vous avez construit |
|---|---|
| 01 | le point de départ : une boutique Vite, Vuetify et routeur, un catalogue chargé à la demande, un panier en Provide/Inject, la convention des `data-testid` |
| 02 | le cœur de la réactivité, écrit par vous (`miniRef`, `miniComputed`, `miniWatchEffect`), puis un `customRef` de recherche avec temporisation, et les pièges de `shallowRef`, `markRaw` et du destructuring |
| 03 | le panier en store Pinia persistant, un plugin de notifications, la directive `v-countdown`, une garde de route et un client http qui renouvelle le jeton une seule fois |
| 04 | le catalogue en cache avec TanStack Query (pagination, recherche, prefetch, invalidation), des réponses validées par Zod, un ajout au panier optimiste avec retour en arrière |
| 05 | les enchères en temps réel : un socket typé, un cache mis à jour par les événements, une offre optimiste avec accusé de réception, la resynchronisation après reconnexion, le décalage d'horloge et une annonce `aria-live` |
| 06 | des composants avancés : une grille générique aux slots typés, `defineModel`, une modale téléportée, un historique animé, une frontière d'erreur (et, en option, le formulaire de commande) |
| 07 | des rendus de composants mesurés puis réduits (environ onze fois moins sur la machine du lab), un `v-memo` essayé et écarté, des données en lecture seule, une modale chargée à la demande, un catalogue gardé en vie |
| 08 | au moins six tests dans chacun de quatre fichiers, écrits par vous et contrôlés par mutation, et le terrain préparé pour les tests de bout en bout |

Les fichiers du lab vivent tous dans `~/byte-layers/vue` : pour tout effacer, supprimez ce dossier, aucune étape ne le fait à votre place.
