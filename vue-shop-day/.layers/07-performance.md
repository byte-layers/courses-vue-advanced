---
title: "07 - Mesurer puis optimiser"
description: "Compter les rendus d'une page d'enchères soumise à dix mises par seconde, essayer le correctif évident (v-memo), constater qu'il ne change rien, puis appliquer celui qui marche, et finir avec des données en lecture seule, une modale chargée à la demande et un catalogue gardé en vie."
---

Sur la page des enchères, le serveur sait envoyer dix mises par seconde sur l'iPhone. L'application reste juste, mais chaque mise déclenche des rendus, et on ne sait pas encore combien. Cette étape suit la règle qui évite les optimisations inutiles : **mesurer d'abord**. Vous relevez un nombre de rendus, vous formulez une hypothèse, vous essayez le correctif que tout le monde essaie (`v-memo`), vous mesurez de nouveau, et vous constatez qu'il ne change rien. Vous cherchez alors la vraie cause et vous corrigez. Trois optimisations plus petites suivent : des données en lecture seule, une modale chargée à la demande, un catalogue qui garde son état.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 06, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 06` : le script copie le code attendu dans `~/byte-layers/vue/shop` et écrase vos fichiers du même nom, pensez à les committer avant.

Un point d'honnêteté sur cette étape : **ce qu'on mesure ici, c'est un nombre de rendus de composants**, pas un temps. Le compteur est précis et reproductible ; il ne dit pas combien de millisecondes un rendu coûte sur votre machine. Les chiffres cités viennent d'un relevé réel, et jamais le texte ne parle de « fois plus rapide ».

## 07.1 - Support : le serveur en ticker rapide et les fichiers fournis

Cette section est un **support** : chaque geste est une commande. Le serveur du lab sait jouer un **ticker rapide** : dix mises par seconde, de 0,01 € chacune, sur l'enchère de l'iPhone. C'est la charge de toute l'étape. Si le serveur de l'étape 05 tourne encore dans un terminal, arrêtez-le avec `Ctrl+C`, puis relancez-le dans ce mode (ses paquets sont déjà installés depuis l'étape 05) :

```exec
label: "Serveur d'enchères, ticker rapide (laisser tourner)"
---
cd ~/byte-layers/vue/course/kit/server && npm run start:fast
```

Le terminal affiche `ticker rapide 10/s`. Les bots ordinaires restent actifs : ils surenchérissent aussi sur les quatre autres enchères, toutes les quatre secondes. Pour un ticker pur, relancez le serveur avec `BOT_INTERVAL_MS=60000 npm run start:fast` (un bot ordinaire par minute) ; ce n'est pas nécessaire ici.

Copiez ensuite les fichiers fournis. **Lisez d'abord ce tableau : cinq fichiers de votre application sont remplacés.**

```exec
cp -R ~/byte-layers/vue/course/kit/steps/07/src/. ~/byte-layers/vue/shop/src/
```

| Fichier | Nature |
|---|---|
| `lib/render-stats.ts` | fourni : le compteur de rendus (section 07.2) |
| `components/common/RenderStats.vue` | fourni : un panneau « Rendus (dev) » qui affiche les compteurs |
| `features/auctions/components/AuctionCard.vue` | fourni, **remplace le vôtre** : la même carte, avec un compteur |
| `features/auctions/components/BidRow.vue`, `BidHistory.vue` | départ, **remplacent les vôtres** : les versions de l'étape 06 avec leurs compteurs ; `BidHistory.vue` porte un commentaire `TODO — À écrire` |
| `features/auctions/pages/AuctionsPage.vue` | départ, **remplace le vôtre** : la page de l'étape 05 avec le panneau de compteurs ; le même commentaire |
| `features/auctions/pages/AuctionsPage.spec.ts` | test existant, mis à jour : il attend maintenant la modale avec `vi.waitFor`, parce qu'elle va devenir asynchrone |
| `BidHistory.render.spec.ts`, `useAuctions.spec.ts`, `AuctionsPage.lazy.spec.ts`, `App.keepalive.spec.ts` | les quatre tests qui valident votre travail |

Si vous aviez ajouté vos propres retouches à l'un des fichiers remplacés, reportez-les après coup : le kit ne peut pas deviner.

L'application doit tourner pour la suite. Si `npm run dev` tourne encore depuis l'étape 06, laissez-le : Vite recharge à chaud. Sinon, lancez-le :

```exec
label: "Application (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

```verify
D=~/byte-layers/vue/shop
for f in src/lib/render-stats.ts src/components/common/RenderStats.vue src/features/auctions/components/BidHistory.render.spec.ts src/features/auctions/pages/AuctionsPage.lazy.spec.ts src/App.keepalive.spec.ts; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez la commande cp de la section 07.1."; exit 1; }
done
grep -q '__renderCounts' "$D/src/lib/render-stats.ts" || { echo "render-stats.ts n'est pas la version fournie : relancez la commande cp de la section 07.1."; exit 1; }
echo "Les fichiers fournis sont en place."
```

## 07.2 - Compter les rendus

Un **rendu** est une exécution de la fonction de rendu d'un composant : la première à l'affichage, puis une à chaque mise à jour. Le fichier fourni `src/lib/render-stats.ts` les compte avec deux crochets du cycle de vie, `onBeforeMount` et `onBeforeUpdate`, et les range dans une `Map` ordinaire :

```ts
export function useRenderCount(name: string) {
  if (!import.meta.env.DEV) return
  onBeforeMount(() => bump(name)) // rendu initial
  onBeforeUpdate(() => bump(name)) // chaque rendu suivant
}
```

Deux choix méritent d'être lus. Les compteurs sont dans une `Map`, **pas dans un `ref`** : un `ref` incrémenté dans `onBeforeUpdate` provoquerait un rendu, qui incrémenterait le `ref`, et la boucle ne s'arrêterait plus. Et le compteur ne fait rien en production (`import.meta.env.DEV`). Les trois composants du chemin chaud l'appellent déjà : `AuctionCard`, `BidHistory` et `BidRow`.

En développement, le fichier expose aussi deux fonctions dans la console du navigateur, `__renderCounts()` et `__resetRenderCounts()`, et la page des enchères affiche le panneau « Rendus (dev) » sous la grille. Relevons la **ligne de base**, avant de toucher au code :

1. Ouvrez `http://localhost:5173/auctions` et **gardez l'onglet visible** pendant toute la mesure. Dans un onglet masqué, le navigateur suspend les animations, les transitions de Vue ne se terminent plus et les lignes sortantes de l'historique s'accumulent dans la page.
2. Sur la carte de l'iPhone, cliquez sur « Enchérir » : la modale s'ouvre avec l'historique des offres, qui se remplit au rythme du ticker.
3. Dans la console, tapez `__resetRenderCounts()`, attendez dix secondes, puis tapez `__renderCounts()`. Le panneau affiche les mêmes nombres, relus deux fois par seconde.

Sur la machine qui a servi à écrire ce lab, dix secondes de ticker avec la modale ouverte (99 offres reçues) ont donné `BidRow` 2 000, `BidHistory` 100 et `AuctionCard` 107, soit **2 207 rendus de composants, environ 22 par offre**. Avec la modale fermée, seule la carte de l'iPhone se refait : environ un rendu par offre, et aucun sur les quatre autres cartes. Vos nombres varieront un peu, selon le rythme réel des offres ; ce sont les **proportions** qui comptent. Un composant domine : `BidRow`, une ligne de l'historique, refaite une vingtaine de fois par offre (l'historique garde 20 lignes).

Les outils de profilage du navigateur et l'extension Vue Devtools permettent d'aller plus loin : enregistrer quelques secondes d'activité et voir où passe le temps de script. Ce lab ne s'en sert pas pour chiffrer, parce que le compteur suffit à montrer le problème, et la façon d'ouvrir ces outils dépend de votre navigateur et de la version de l'extension : suivez leur documentation. Pour savoir **pourquoi** un composant se refait, Vue offre en développement le crochet `onRenderTriggered`, qui donne la dépendance réactive à l'origine du rendu.

```acknowledge
J'ai relevé les compteurs de rendus pendant dix secondes de ticker, avec la modale de l'iPhone ouverte
```

> 📖 [Vue : performance, options de profilage](https://vuejs.org/guide/best-practices/performance.html#profiling-options) · [Vue : `onRenderTriggered`](https://vuejs.org/api/composition-api-lifecycle.html#onrendertriggered) · [Vue Devtools](https://devtools.vuejs.org/) · [Chrome : analyser les performances d'exécution](https://developer.chrome.com/docs/devtools/performance)

## 07.3 - Une hypothèse, et le correctif que tout le monde essaie

Pourquoi `BidRow` se refait-il vingt fois par offre ? Regardons ce que `BidHistory.vue` lui passe :

```vue
<BidRow v-for="(bid, index) in bids" :key="bid.version" :bid="bid" :index="index" />
```

Une nouvelle offre arrive en **tête** du tableau. La ligne qui était en position 0 passe en position 1, celle de la position 1 en position 2, et ainsi de suite : la prop `index` change pour chaque ligne. On tient une hypothèse : toutes les lignes se refont parce que leur `index` change. Et Vue a une directive pour cela, **`v-memo`** : elle prend un tableau de valeurs, et saute le rendu du sous-arbre tant que ces valeurs sont les mêmes qu'au rendu précédent. Ici, une ligne n'a besoin de se refaire que si son offre change, ou si elle devient (ou cesse d'être) la première.

Essayez-la : dans `BidHistory.vue`, ajoutez `v-memo` sur la ligne `<BidRow …>`, avec les deux valeurs dont l'affichage dépend.

```vue
<BidRow
  v-for="(bid, index) in bids"
  :key="bid.version"
  v-memo="[bid.version, index === 0]"
  :bid="bid"
  :index="index"
/>
```

Mesurez de nouveau. Dans la console du navigateur : `__resetRenderCounts()`, dix secondes, `__renderCounts()`. Le test fourni, `BidHistory.render.spec.ts`, rejoue une mesure déterministe : cinquante offres qui arrivent une à une, avec le **vrai** `TransitionGroup`, et il affiche le total. Lancez-le (il échoue encore, c'est attendu : il fixe l'objectif de la section suivante) :

```sh
cd ~/byte-layers/vue/shop && npx vitest run src/features/auctions/components/BidHistory.render.spec.ts
```

Sa sortie contient une ligne de mesure, qui donne le nombre de rendus de chaque composant pour les cinquante offres.

```text
rendus pour 50 offres : { BidHistory: 50, BidRow: 1000 }
```

**Mille rendus de `BidRow` pour cinquante offres, avec ou sans `v-memo`** : la directive n'a rien changé. Dans le navigateur de la machine du lab, le relevé de dix secondes est le même avec et sans `v-memo` (1 980 rendus de `BidRow` pour 99 offres avec la directive). Le correctif évident ne corrige rien, et vous venez de le prouver au lieu de le supposer. C'est la raison d'être de cette étape.

```acknowledge
J'ai ajouté v-memo, mesuré de nouveau, et le nombre de rendus de BidRow n'a pas bougé
```

> 📖 [Vue : `v-memo`](https://vuejs.org/api/built-in-directives.html#v-memo)

## 07.4 - Pourquoi `v-memo` n'a rien changé, et le correctif qui marche

Deux raisons s'additionnent.

La première est propre à `v-memo` dans un `v-for` : son cache est **positionnel**. Le code que Vue compile range, pour chaque position `i`, les valeurs du dernier rendu, et les compare à celles de la position `i` au rendu suivant. Quand une offre s'insère en tête, la position `i` contient maintenant l'offre qui était en `i - 1` : les valeurs diffèrent partout, le cache est invalidé partout. `v-memo` sert à une liste dont les éléments gardent leur place (une longue liste qu'on filtre, un tableau dont on édite une cellule) ; une insertion en tête est son pire cas.

La seconde est la vraie cause, et elle vaut même sans `v-memo` : **un composant enfant d'un `TransitionGroup` (ou d'un `Transition`) est refait à chaque rendu de son parent, même si ses props sont identiques.** Vue doit lui réappliquer ses crochets de transition, alors elle ne saute pas son rendu. La mesure l'a montré : avec un indicateur booléen stable à la place de `index` (`:leading="index === 0"`), le compte reste à 1 000 avec le vrai `TransitionGroup`. Un détail de test à retenir : l'utilitaire de test de Vue **remplace `TransitionGroup` par un faux** qui n'applique rien aux enfants, et ce faux masque ce coût. C'est pour cela que `BidHistory.render.spec.ts` demande le vrai (`stubs: { TransitionGroup: false }`).

Que corriger, alors ? On peut ne pas animer une liste chaude, ou grouper les mises à jour. Le correctif retenu garde l'animation : **les lignes deviennent des éléments, pas des composants**. Un `<li>` enfant du groupe n'a pas de rendu propre : c'est le rendu de `BidHistory`, un seul par offre, qui les met à jour. Le coût passe de vingt-deux rendus par offre à environ deux.

Ouvrez `src/features/auctions/components/BidHistory.vue`. Il importe `BidRow` et lui délègue chaque ligne.

**À vous** : mettez le contenu de `BidRow.vue` directement dans `BidHistory.vue`, sous forme d'un `<li>` avec la même `key`, puis supprimez l'import de `BidRow`, la directive `v-memo` de la section précédente et le commentaire `TODO — À écrire`. Supprimez aussi le fichier `src/features/auctions/components/BidRow.vue`, qui n'est plus utilisé. Gardez `useRenderCount('BidHistory')`.

**Critères :**

- chaque ligne est un `<li>` avec `class="bid-row"` et `data-testid="bid-row"`, clé `bid.version`, et affiche l'enchérisseur, le prix (`formatMoney`), l'heure et, sur la première ligne seulement, une pastille `data-testid="bid-row-leading"` « en tête » ;
- `BidHistory.vue` ne rend plus aucun composant par ligne, et garde son `TransitionGroup` ;
- cinquante offres coûtent **au plus deux rendus de composant par offre**, tous composants confondus, et l'affichage reste exact : la dernière offre en tête, une seule ligne « en tête » ;
- le style de la ligne (`.bid-row` : `display: flex`, `align-items: center`, `gap: 12px`, `padding: 4px 0`) passe dans le `<style scoped>` de `BidHistory.vue`.

```hint
`BidRow.vue` contient tout ce qu'il faut : sa balise `<li>`, son format d'heure (`new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' })`) et son style. Importez `formatMoney` de `@/lib/money` dans `BidHistory.vue` et déclarez le format d'heure dans le `<script setup>`.
```

```hint
Dans le `TransitionGroup`, le `v-for` se pose maintenant sur le `<li>` : `<li v-for="(bid, index) in bids" :key="bid.version" class="bid-row" data-testid="bid-row">`. `index` reste disponible pour la pastille : `v-if="index === 0"`.
```

````solution
```vue
<script setup lang="ts">
import { formatMoney } from '@/lib/money'
import { useRenderCount } from '@/lib/render-stats'
import type { BidEvent } from '@/shared/events'

// Les offres, la plus récente en premier. `TransitionGroup` anime l'arrivée, le départ et le
// déplacement des lignes : chacune doit avoir une `key` stable (la version de l'offre).
defineProps<{ bids: readonly BidEvent[] }>()
useRenderCount('BidHistory')

const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' })
</script>

<template>
  <p v-if="bids.length === 0" data-testid="bid-history-empty">
    Aucune offre reçue depuis votre arrivée.
  </p>
  <TransitionGroup v-else tag="ul" name="bid" class="bid-history" data-testid="bid-history">
    <!--
      Les lignes sont des ÉLÉMENTS, pas un composant `BidRow` : un composant enfant de TransitionGroup est refait
      à chaque rendu du parent, même si ses props n'ont pas changé (Vue doit lui réappliquer ses hooks de
      transition). Avec une ligne par composant, chaque offre refaisait les 20 lignes.
    -->
    <li
      v-for="(bid, index) in bids"
      :key="bid.version"
      class="bid-row"
      data-testid="bid-row"
    >
      <span class="font-weight-medium">{{ bid.bidder }}</span>
      <span>{{ formatMoney(bid.price) }}</span>
      <span class="text-medium-emphasis">{{ time.format(bid.at) }}</span>
      <v-chip v-if="index === 0" size="x-small" color="success" data-testid="bid-row-leading">
        en tête
      </v-chip>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.bid-history {
  list-style: none;
  padding: 0;
  position: relative;
}
.bid-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}
.bid-enter-active,
.bid-leave-active,
.bid-move {
  transition: all 0.3s ease;
}
.bid-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.bid-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
/* Une ligne qui sort ne doit plus occuper de place : les autres se déplacent en douceur. */
.bid-leave-active {
  position: absolute;
}
</style>
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/components/BidHistory.vue"
grep -q 'À écrire' "$F" && { echo "BidHistory.vue contient encore le commentaire « TODO — À écrire » : corrigez le composant, puis supprimez ce commentaire."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/components/BidHistory.render.spec.ts >/dev/null 2>&1) || { echo "Le test de rendus échoue : lancez « npx vitest run src/features/auctions/components/BidHistory.render.spec.ts » dans ~/byte-layers/vue/shop. Sa ligne « rendus pour 50 offres » donne le compte : il doit rester sous 100, avec la dernière offre en tête et une seule pastille « en tête »."; exit 1; }
echo "Cinquante offres coûtent au plus deux rendus chacune, et l'historique reste exact."
```

Relevez une dernière fois les compteurs dans le navigateur, avec la même procédure qu'à la section 07.2. Sur la machine du lab : `BidHistory` 98, `AuctionCard` 105, soit **203 rendus de composants contre 2 207, environ onze fois moins**. `BidRow` a disparu du relevé. On ne dit rien de plus que ce que le compteur sait : le nombre de rendus a baissé d'un facteur onze, le temps gagné reste à mesurer avec le profileur du navigateur.

```acknowledge
J'ai relevé les compteurs après le correctif : BidRow n'apparaît plus et le total est de l'ordre de 200 rendus pour dix secondes
```

À retenir : `v-memo` n'est pas inutile, il vise un autre cas. Un composant qui ne bouge pas de place, dans une liste longue, hors d'un groupe de transitions. La mesure décide, pas l'intuition.

> 📖 [Vue : `TransitionGroup`](https://vuejs.org/guide/built-ins/transition-group.html) · [Vue : mises à jour, optimisations](https://vuejs.org/guide/best-practices/performance.html#update-optimizations)

## 07.5 - Des données en lecture seule : `shallow`

Par défaut, TanStack Query rend la propriété `data` **profondément réactive** : chaque enchère du cache, chaque offre de l'historique est enveloppée dans un `Proxy`. C'est utile quand on modifie un objet en place. Ici, on ne le fait jamais : le socket **remplace** une enchère dans le cache par une copie à jour (`setQueryData`, étape 05). Des `Proxy` sur des objets qu'on ne mute pas sont un coût sans contrepartie.

L'option `shallow: true` de `useQuery` fait de `data` un **`shallowRef`** (étape 02) : seul le remplacement de la valeur est réactif, ni le tableau ni son contenu ne sont enveloppés. Mise en garde sur la portée : la mesure de la section précédente n'a pas chiffré ce gain. C'est un correctif **de principe**, sûr parce que les objets ne sont jamais modifiés, et il ne se justifie que par cette garantie.

Ouvrez `src/features/auctions/useAuctions.ts`. Il déclare deux requêtes alimentées par le socket, `useAuctions` et `useBidHistory`.

**À vous** : ajoutez `shallow: true` aux options des **deux** requêtes.

**Critères :**

- la liste des enchères et l'historique d'une enchère ne sont pas profondément réactifs : ni le tableau ni un de ses éléments n'est un `Proxy` ;
- la valeur reste à jour : remplacer l'enchère dans le cache met toujours `auctions` à jour.

```hint
`shallow` est une option de `useQuery`, au même niveau que `queryKey`, `queryFn` et `staleTime`.
```

````solution
```ts
export function useAuctions() {
  const query = useQuery<AuctionState[]>({
    queryKey: auctionKeys.list(),
    queryFn: skipToken,
    staleTime: Infinity,
    // `shallow` : `data` est un `shallowRef`. Par défaut TanStack Query le rend PROFONDÉMENT réactif
    // (un Proxy par enchère, par offre) ; or on ne modifie jamais un objet du cache, on le remplace.
    shallow: true,
  })
  return { ...query, auctions: query.data }
}

/** Historique des offres d'une enchère, la plus récente en premier (vide tant qu'aucune n'est arrivée). */
export function useBidHistory(productId: MaybeRefOrGetter<number>) {
  const query = useQuery<BidEvent[]>({
    queryKey: computed(() => auctionKeys.bids(toValue(productId))),
    queryFn: skipToken,
    staleTime: Infinity,
    shallow: true, // des événements figés : pas besoin d'en faire des Proxy
  })
  return computed(() => query.data.value ?? [])
}
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/features/auctions/useAuctions.spec.ts >/dev/null 2>&1) || { echo "Les tests de lecture seule échouent : lancez « npx vitest run src/features/auctions/useAuctions.spec.ts » dans ~/byte-layers/vue/shop. Ils attendent que la liste ET l'historique ne soient pas réactifs en profondeur : ajoutez shallow: true aux deux useQuery."; exit 1; }
echo "Les données du cache des enchères sont en lecture seule, et restent à jour."
```

> 📖 [Vue : `shallowRef`](https://vuejs.org/api/reactivity-advanced.html#shallowref) · [Vue : réduire le coût de réactivité des grandes structures immuables](https://vuejs.org/guide/best-practices/performance.html#reduce-reactivity-overhead-for-large-immutable-structures) · [TanStack Query pour Vue : réactivité](https://tanstack.com/query/v5/docs/framework/vue/reactivity)

## 07.6 - Charger la modale à la demande : `defineAsyncComponent`

La modale d'enchère (formulaire, historique, animations) n'est utile qu'après un clic, mais `AuctionsPage.vue` l'importe en tête de fichier : son code part dans le même fichier JavaScript que la page, et il est téléchargé avec elle. `defineAsyncComponent` prend une fonction qui renvoie un `import()` dynamique : le bundler coupe alors le module en un **fichier séparé**, que le navigateur ne télécharge qu'au premier affichage du composant.

Un effet à connaître : le composant devient **asynchrone**. Le premier clic affiche la modale un court instant plus tard, le temps du téléchargement, puis les suivants sont immédiats. C'est pour cela que le test existant `AuctionsPage.spec.ts` a été mis à jour : il attend la modale avec `vi.waitFor`, et ne se contente plus d'un `flushPromises`, qui ne suffit pas pour un chargement de module.

Ouvrez `src/features/auctions/pages/AuctionsPage.vue`.

**À vous** : remplacez l'import statique de la modale par `defineAsyncComponent`, et supprimez le commentaire `TODO — À écrire`.

**Critères :**

- `AuctionsPage.vue` n'importe plus `AuctionModal.vue` en tête de fichier : le composant est déclaré avec `defineAsyncComponent(() => import('../components/AuctionModal.vue'))` ;
- le code de la modale n'est pas chargé tant qu'on n'ouvre rien, et se charge à la première ouverture ;
- la page continue de fonctionner : les tests de la page, mis à jour, restent verts.

```hint
Dans l'import de `vue`, ajoutez `defineAsyncComponent` à côté de `computed`. Le composant se déclare comme une constante dans le `<script setup>`, et s'utilise dans le gabarit sous ce nom, sans autre changement.
```

````solution
```vue
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import RenderStats from '@/components/common/RenderStats.vue'
import AuctionCard from '../components/AuctionCard.vue'
import { useAuctionStore } from '../auctionStore'
import { useAuctions } from '../useAuctions'
import { useAuctionSocket } from '../useAuctionSocket'

// La connexion naît avec la page et meurt avec elle (onScopeDispose dans le composable).
const DEV = import.meta.env.DEV
// La modale (formulaire, historique, animations) n'est téléchargée qu'à la première ouverture.
const AuctionModal = defineAsyncComponent(() => import('../components/AuctionModal.vue'))
const { clockOffset, reconnect } = useAuctionSocket()
// … la suite du fichier ne change pas
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/pages/AuctionsPage.vue"
grep -q 'À écrire' "$F" && { echo "AuctionsPage.vue contient encore le commentaire « TODO — À écrire » : chargez la modale avec defineAsyncComponent, puis supprimez ce commentaire."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/pages/AuctionsPage.lazy.spec.ts src/features/auctions/pages/AuctionsPage.spec.ts >/dev/null 2>&1) || { echo "Les tests de la page échouent : lancez « npx vitest run src/features/auctions/pages » dans ~/byte-layers/vue/shop. Le test « chargée à la demande » exige que le module de la modale ne soit pas chargé avant la première ouverture : supprimez l'import statique."; exit 1; }
echo "La modale est un composant asynchrone : son code n'est chargé qu'à la première ouverture."
```

Le résultat se voit dans la construction de production : lancez-la et cherchez, dans la liste des fichiers produits, un fichier `AuctionModal-….js` à part, d'environ 7 ko.

```exec
cd ~/byte-layers/vue/shop && npm run build
```

> 📖 [Vue : composants asynchrones](https://vuejs.org/guide/components/async.html)

## 07.7 - Garder le catalogue en vie : `KeepAlive`

Allez sur `/products`, passez à la page 2, tapez une recherche, puis cliquez sur « Enchères » et revenez : le catalogue est reparti de zéro, page 1, recherche vide. À chaque navigation, le routeur **démonte** la page, et son état local disparaît avec elle.

`KeepAlive` change cela : il **met en cache l'instance** d'un composant au lieu de la détruire quand elle sort de l'écran, et la remet telle quelle à son retour. L'état local (page, recherche, catégorie, position de défilement) survit, et le cache de TanStack Query n'y est pour rien : c'est la même instance de composant. Son option `include` désigne les composants à garder **par leur nom** : le nom d'un `<script setup>` est celui de son fichier, ici `ProductListPage`, sans rien à déclarer.

Deux conséquences. Une page gardée en vie n'est **ni démontée ni remontée** : ses crochets `onUnmounted` et ses `onScopeDispose` ne s'exécutent plus, et Vue fournit `onActivated` et `onDeactivated` pour réagir aux sorties et aux retours. Et le choix de ce qu'on garde compte : la page des enchères ne figure pas dans `include`, parce que sa connexion socket est fermée à son démontage (étape 05), et c'est voulu : on ne veut pas d'un socket ouvert derrière une page qu'on ne voit pas. `KeepAlive` accepte aussi `max`, pour borner le nombre d'instances conservées.

Ouvrez `src/App.vue`. Le routeur y est rendu par `<RouterView />`, à l'intérieur de `ErrorBoundary`.

**À vous** : enveloppez le composant de la route dans un `KeepAlive` qui ne garde que `ProductListPage`.

**Critères :**

- `RouterView` expose le composant courant avec `v-slot="{ Component }"`, et un `<component :is="Component" />` est placé dans un `<KeepAlive include="ProductListPage">` ;
- l'enveloppe reste **à l'intérieur** de `ErrorBoundary` ;
- après un passage par `/auctions`, le catalogue est comme on l'a laissé : même page, même recherche.

```hint
`<RouterView v-slot="{ Component }">` donne la page courante dans `Component`. Le `KeepAlive` se place entre `RouterView` et le `<component :is="Component" />`.
```

````solution
```vue
<ErrorBoundary :reset-key="route.fullPath">
  <!--
    KeepAlive : le catalogue garde son état (recherche, catégorie, page) quand on va voir les enchères
    et qu'on revient. `include` désigne les composants par leur NOM (celui du fichier, ici ProductListPage).
  -->
  <RouterView v-slot="{ Component }">
    <KeepAlive include="ProductListPage">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</ErrorBoundary>
```
````

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/App.keepalive.spec.ts >/dev/null 2>&1) || { echo "Les tests du catalogue gardé en vie échouent : lancez « npx vitest run src/App.keepalive.spec.ts » dans ~/byte-layers/vue/shop. Après un passage par /auctions, la page 2 et la recherche doivent être conservées : enveloppez le composant de la route dans un KeepAlive avec include=\"ProductListPage\"."; exit 1; }
echo "Le catalogue garde sa page et sa recherche quand on va voir les enchères."
```

Vérifiez-le à la main : page 2, une recherche, « Enchères », puis « Produits ». Vous retrouvez la page 2 et la recherche.

```acknowledge
J'ai retrouvé la page 2 et ma recherche en revenant sur le catalogue
```

> 📖 [Vue : `KeepAlive`](https://vuejs.org/guide/built-ins/keep-alive.html)

## 07.8 - Tout vérifier d'un coup

Avant de passer aux tests, il faut que les trois commandes de qualité du projet passent : `npm run type-check`, `npm run lint` et `npm test` (toute la suite, soit 201 tests, dont 9 nouveaux à cette étape). Le bouton ci-dessous les lance pour vous, dans cet ordre, et s'arrête au premier échec.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur. Si elle cite BidRow, un fichier l'importe encore."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Cherchez un import devenu inutile (BidRow, AuctionModal) ou un commentaire eslint-disable oublié."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent : l'application est dans l'état de fin d'étape 07."
```

## Récap

- **Mesurer d'abord** : un compteur de rendus (`useRenderCount`, `__renderCounts()`) donne des nombres reproductibles. Avec la modale ouverte, dix secondes de ticker coûtaient 2 207 rendus de composants, 203 après correction, soit environ onze fois moins. Aucun temps CPU n'a été relevé : pour cela, il faut le profileur du navigateur.
- **Une hypothèse se teste** : `v-memo` n'a pas corrigé l'historique, parce que son cache est positionnel et parce qu'un composant enfant d'un `TransitionGroup` est refait à chaque rendu du parent. Le correctif a été de mettre des éléments à la place des composants.
- `shallow: true` fait des données du cache un `shallowRef` quand on ne les modifie jamais, `defineAsyncComponent` coupe la modale en un fichier chargé à la demande, `KeepAlive` conserve l'état du catalogue d'une navigation à l'autre.
- Le faux `TransitionGroup` de l'utilitaire de test masque un coût réel : un test de rendus demande le vrai.

L'étape suivante est la dernière : vous écrivez les tests de l'application, avec des outils qui ont tous un rôle précis, et un script qui vérifie qu'ils valent quelque chose.
