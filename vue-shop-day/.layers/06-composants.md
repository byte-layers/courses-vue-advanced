---
title: "06 - Composants avancés"
description: "Écrire les composants que la boutique et les enchères réclament : une grille générique aux slots typés, un champ en v-model avec defineModel, un historique animé, une frontière d'erreur et une modale téléportée, avec en option un checkout VeeValidate et Zod."
---

**Durée** : environ 80 minutes pour le cœur de l'étape, et environ 40 minutes de plus pour l'option du checkout (sections 06.11 à 06.14).

Les enchères fonctionnent, mais l'interface qui les porte est faite de bouts de gabarit. Cette étape écrit les **composants** qui manquent, chacun avec l'outil de Vue qui lui correspond : une grille **générique** dont les slots sont typés (`generic`, `defineSlots`), un champ d'offre en `v-model` (`defineModel`), un historique animé (`TransitionGroup`), une frontière d'erreur (`onErrorCaptured`), puis une modale **téléportée** (`Teleport`) qui rassemble les précédents. L'étape se termine par une **option d'environ 40 minutes**, clairement marquée, que vous pouvez sauter sans rien casser : un formulaire de commande validé avec VeeValidate et Zod.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 05, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 05` : le script copie le code attendu dans `~/byte-layers/vue/shop` et écrase vos fichiers du même nom, pensez à les committer avant.

## 06.1 - Support : copier les fichiers fournis

Cette section est un **support** : un seul geste, une commande. Copiez les fichiers de l'étape dans l'application, depuis la racine de `shop` parce que l'étape fournit aussi des fichiers de configuration. La copie **écrase** quatre fichiers existants (`vite.config.ts`, `tsconfig.app.json`, `src/test/setup.ts` et `AuctionModal.vue`) : le dépôt `shop` est versionné depuis l'étape 01, committez d'abord ce que vous avez modifié. Aucun paquet n'est à installer pour le cœur de l'étape.

```exec
cp -R ~/byte-layers/vue/course/kit/steps/06/. ~/byte-layers/vue/shop/
```

Voici ce que vous venez de recevoir. Les six squelettes sont à écrire (ils jettent `À écrire`, ou, pour la modale, portent un `TODO` en tête). Trois autres fichiers existants, que le kit ne remplace pas, sont à **modifier à la main** : `ProductListPage.vue` (section 06.3), puis `main.ts` et `App.vue` (section 06.7, `App.vue` encore en 06.8). La section 06.8 réécrit les versions de l'étape 05 de `AuctionModal.vue`, qui était fournie à l'étape 05 : l'étape 06 en fait des versions construites par vous.

| Fichier (sous `src/`) | Nature |
|---|---|
| `components/ProductGrid.vue` | squelette : la grille générique |
| `features/auctions/components/BidAmountInput.vue` | squelette : le champ d'offre |
| `features/auctions/components/BidHistory.vue` | squelette : l'historique animé |
| `components/common/ErrorBoundary.vue`, `plugins/errorHandler.ts` | squelettes : la frontière d'erreur et le dernier filet |
| `features/auctions/components/AuctionModal.vue` | **remplacé** par la fenêtre de l'étape 05, avec un `TODO` : à transformer en modale téléportée |
| `features/auctions/components/BidRow.vue` | fourni : une ligne de l'historique |
| `*.spec.ts`, `ProductGrid.test-d.ts`, `App.spec.ts` | les tests qui valident votre travail |
| `test/setup.ts`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.typetest.json` | **remplacés** : la cible `#modals` des tests, et la configuration des tests de types (section 06.2) |

Tant que les squelettes ne sont pas écrits, les pages qui les emploient affichent une erreur `À écrire` : n'ouvrez pas l'application avant la section 06.9 : si `npm run dev` tourne, le navigateur afficherait `À écrire`. Vite redémarre seul quand `vite.config.ts` change ; si vous n'avez plus `npm run dev` ni le serveur d'enchères, la section 06.9 les relance.

```verify
D=~/byte-layers/vue/shop
for f in src/components/ProductGrid.vue src/features/auctions/components/BidAmountInput.vue src/features/auctions/components/BidHistory.vue src/features/auctions/components/BidRow.vue src/components/common/ErrorBoundary.vue src/plugins/errorHandler.ts src/App.spec.ts tsconfig.typetest.json; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez la commande cp de la section 06.1."; exit 1; }
done
echo "Les fichiers fournis sont en place."
```

## 06.2 - Un composant générique : la grille `ProductGrid<T>`

La page du catalogue dessine ses produits avec un `v-row` et une boucle. Mais une grille qui range des éléments dans des colonnes **n'a pas besoin de savoir ce qu'est un élément** : seulement qu'il a un `id` pour être suivi par `v-for`. Un composant **générique** exprime exactement cela. Dans `<script setup>`, l'attribut `generic` déclare des paramètres de type pour le composant :

```vue
<script setup lang="ts" generic="T extends { id: number }">
defineProps<{ items: readonly T[] }>()
</script>
```

`T` n'est pas écrit par le parent : TypeScript le **déduit** de la prop `items`. Si le parent passe un `Product[]`, `T` vaut `Product` ; si c'est un tableau d'objets sans `id`, le type-check échoue. Le deuxième besoin est de laisser le parent dessiner chaque cellule. C'est le rôle d'un **slot à portée** (scoped slot) : le composant enfant appelle `<slot name="item" :item="item">` et le parent reçoit `item` dans son propre gabarit avec `<template #item="{ item }">`. `defineSlots` donne un type à ces slots, avec le même `T` :

```ts
defineSlots<{
  item(props: { item: T; index: number }): unknown
  empty?(): unknown
  header?(props: { count: number }): unknown
}>()
```

Grâce à lui, dans `#item="{ item }"`, `item` est un `Product` : l'éditeur complète `item.title`, et une faute de frappe devient une erreur de `npm run type-check` (Vite, lui, ne vérifie pas les types), pas un `undefined` à l'exécution. `defineSlots` rend ces types explicites et permet de déclarer des slots facultatifs. Un slot facultatif se déclare avec `?` (ici `empty` et `header`).

Un mot sur le test fourni `ProductGrid.test-d.ts`. Il ne s'**exécute** pas : il vérifie des **types**. Vitest le fait compiler par `vue-tsc` (c'est le bloc `test.typecheck` de `vite.config.ts` que vous venez de recevoir), et il échoue si un type est faux, par exemple si `item` n'est pas un `T` ou si un `T` sans `id` numérique est accepté.

Ouvrez `src/components/ProductGrid.vue`. Les consignes sont dans le commentaire en tête.

**À vous** : remplacez le contenu du squelette par la grille générique.

**Critères :**

- `<script setup lang="ts" generic="T extends { id: number }">`, une prop `items: readonly T[]` et `defineSlots` comme ci-dessus ;
- la racine porte `data-testid="product-grid"` ; le slot `header` reçoit `count` (le nombre d'éléments) ;
- si `items` est vide : un `<div data-testid="product-grid-empty">` qui contient le slot `empty`, avec le texte « Rien à afficher. » par défaut ;
- sinon un `<v-row>` avec une `<v-col data-testid="product-grid-cell" cols="12" sm="6" md="4" lg="3">` **par élément**, clée par `item.id`, qui contient le slot `item` (il reçoit `item` et `index`).

```hint
Le texte par défaut d'un slot se met entre ses balises : `<slot name="empty">Rien à afficher.</slot>`. Une clé est `:key="item.id"` sur la `v-col`, pas sur le slot.
```

````solution
```vue
<script setup lang="ts" generic="T extends { id: number }">
defineProps<{ items: readonly T[] }>()
defineSlots<{
  /** Une cellule de la grille. */
  item(props: { item: T; index: number }): unknown
  /** Contenu affiché quand `items` est vide. */
  empty?(): unknown
  /** Au-dessus de la grille ; reçoit le nombre d'éléments. */
  header?(props: { count: number }): unknown
}>()
</script>

<template>
  <div data-testid="product-grid">
    <slot name="header" :count="items.length" />
    <div v-if="items.length === 0" data-testid="product-grid-empty">
      <slot name="empty">Rien à afficher.</slot>
    </div>
    <v-row v-else>
      <v-col
        v-for="(item, index) in items"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        data-testid="product-grid-cell"
      >
        <slot name="item" :item="item" :index="index" />
      </v-col>
    </v-row>
  </div>
</template>
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/components/ProductGrid.vue"
grep -q 'À écrire' "$F" && { echo "ProductGrid.vue contient encore « À écrire » : remplacez le squelette par la grille générique."; exit 1; }
grep -q 'generic=' "$F" || { echo "ProductGrid.vue n'est pas générique : déclarez generic=\"T extends { id: number }\" dans la balise <script setup>."; exit 1; }
(cd "$D" && npx vitest run src/components/ProductGrid.spec.ts >/dev/null 2>&1) || { echo "Les tests de rendu de la grille échouent : lancez « npx vitest run src/components/ProductGrid.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Les cellules sont clées par id, et les slots item, empty et header sont rendus."; exit 1; }
(cd "$D" && npx vitest run src/components/ProductGrid.test-d.ts >/dev/null 2>&1) || { echo "Les tests de types de la grille échouent : lancez « npx vitest run src/components/ProductGrid.test-d.ts » dans ~/byte-layers/vue/shop. item doit être un T déduit de items, et un T sans id numérique doit être refusé : vérifiez generic=\"T extends { id: number }\" et defineSlots."; exit 1; }
echo "La grille est générique, ses slots sont typés et ses cellules sont clées par id."
```

> 📖 [Vue : composants génériques (`generic`)](https://vuejs.org/api/sfc-script-setup.html#generics) · [Vue : slots à portée et `defineSlots`](https://vuejs.org/guide/components/slots.html) · [`defineSlots`](https://vuejs.org/api/sfc-script-setup.html#defineslots) · [Vue et TypeScript : typer les composants](https://vuejs.org/guide/typescript/composition-api.html)

## 06.3 - Brancher la grille sur le catalogue

La grille existe ; la page du catalogue ne l'emploie pas encore. Ce fichier n'est pas fourni, car il consomme le **type générique** de la grille : un squelette non générique n'aurait pas compilé. Vous le modifiez donc à la main. Ouvrez `src/features/products/pages/ProductListPage.vue`.

Première modification : ajoutez l'import de la grille dans `<script setup>`, à la suite des imports existants.

```ts
import ProductGrid from '@/components/ProductGrid.vue'
```

Seconde modification, dans le gabarit : le `v-row` qui contient la boucle sur `products` est remplacé par la grille. Les consignes de style (`opacity-60` pendant un rechargement) et le `data-testid="product-list"` passent sur la grille, qui les place sur sa racine.

| Avant | Après |
|---|---|
| le bloc `<v-row data-testid="product-list" :class="{ 'opacity-60': isFetching }">` jusqu'à son `</v-row>`, avec sa `v-col` et sa boucle `v-for="product in products"` | le bloc ci-dessous |

Voici le bloc qui remplace le `v-row` :

```vue
<ProductGrid :items="products" :class="{ 'opacity-60': isFetching }" data-testid="product-list">
  <template #item="{ item }">
    <ProductCard :product="item" />
  </template>
</ProductGrid>
```

La pagination qui suit la liste ne change pas. Voici le bénéfice du typage : dans `#item="{ item }"`, `item` est un `Product`. Vérifiez-le : remplacez provisoirement `:product="item"` par `:product="item.titel"` (une faute de frappe), lancez `npm run type-check` dans `~/byte-layers/vue/shop` et lisez l'erreur, qui nomme `titel` et propose `title`. Remettez `:product="item"` ensuite.

````solution
```vue
<template v-else>
  <ProductGrid :items="products" :class="{ 'opacity-60': isFetching }" data-testid="product-list">
    <template #item="{ item }">
      <ProductCard :product="item" />
    </template>
  </ProductGrid>
  <v-pagination
    v-model="page"
    :length="pageCount"
    class="mt-4"
    data-testid="product-pagination"
  />
</template>
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/products/pages/ProductListPage.vue"
grep -q 'ProductGrid' "$F" || { echo "ProductListPage.vue n'utilise pas la grille : importez ProductGrid et remplacez le v-row, comme dans la section 06.3."; exit 1; }
grep -q 'titel' "$F" && { echo "Il reste la faute de frappe « titel » dans ProductListPage.vue : remettez :product=\"item\"."; exit 1; }
(cd "$D" && npx vitest run src/features/products/pages/ProductListPage.spec.ts >/dev/null 2>&1) || { echo "Les tests de la page échouent : lancez « npx vitest run src/features/products/pages/ProductListPage.spec.ts » dans ~/byte-layers/vue/shop. Ils attendent 12 cellules product-grid-cell qui contiennent chacune une carte product-card."; exit 1; }
echo "Le catalogue passe par la grille générique."
```

## 06.4 - Un champ en `v-model` : `defineModel`

Le champ d'offre de la fenêtre est un simple `v-text-field`. On veut un composant réutilisable avec des boutons « − » et « + », qui se branche comme n'importe quel champ : `<BidAmountInput v-model="amount" />`. Un composant qui accepte `v-model` déclare normalement une prop `modelValue` et émet un événement `update:modelValue`. `defineModel` fait les deux d'un coup et vous rend une **ref** : la lire donne la valeur du parent, l'assigner émet la mise à jour.

```ts
const model = defineModel<number>({ required: true })

model.value = 470 // émet update:modelValue avec 470 : le parent met à jour sa variable
```

Le champ a donc une seule source de vérité, celle du parent, et aucun `watch` pour la recopier. Les réglages restent des props ordinaires : le plus petit montant (`min`), le pas des boutons (`step`) et l'étiquette (`label`), avec des valeurs par défaut posées par `withDefaults`. Un détail pour le champ de saisie : un `<input type="number">` rend du **texte**, parfois vide ou illisible ; on n'écrit dans le modèle que des **nombres valides**, jamais `NaN` ni une chaîne vide, sans quoi le prix du parent deviendrait invalide à la moindre frappe.

Ouvrez `src/features/auctions/components/BidAmountInput.vue`.

**À vous** : écrivez le composant.

**Critères :**

- `const model = defineModel<number>({ required: true })`, et des props `min` (0), `step` (5) et `label` (« Votre offre (€) ») avec `withDefaults` : remplacez **tout** le script du squelette, en particulier sa prop `modelValue`, que `defineModel` déclare à sa place ;
- le bouton « − » (`aria-label` « Diminuer l’offre », `data-testid="bid-amount-decrease"`) et le bouton « + » (« Augmenter l’offre », `bid-amount-increase`) changent le modèle de `±step`, arrondi à 2 décimales, sans jamais descendre sous `min` (les boutons seulement : une saisie au clavier n'est pas bornée) ; « − » est **désactivé** quand `model - step < min` ;
- un `v-text-field type="number"` (`data-testid="bid-amount-field"`) affiche le modèle ; la saisie n'écrit dans le modèle que si c'est un nombre fini ;
- la racine porte `data-testid="bid-amount"`. Un `data-testid` donné par le parent **remplace** celui de la racine : c'est ainsi que la fenêtre posera `auction-modal-amount`.

```hint
`withDefaults(defineProps<{ min?: number; step?: number; label?: string }>(), { min: 0, step: 5, label: 'Votre offre (€)' })`. L'arrondi à 2 décimales : `Math.round(n * 100) / 100`.
```

```hint
Le champ de saisie envoie du texte : `const amount = Number(value)`, puis `if (value !== null && value.trim() !== '' && Number.isFinite(amount)) model.value = amount`. Les boutons utilisent des icônes `icon="mdi-minus"` et `icon="mdi-plus"`.
```

````solution
```vue
<script setup lang="ts">
const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Plus petite offre permise. */
    min?: number
    /** Valeur ajoutée ou retirée par les boutons + et −. */
    step?: number
    label?: string
  }>(),
  { min: 0, step: 5, label: 'Votre offre (€)' },
)

const round2 = (n: number) => Math.round(n * 100) / 100

function bump(delta: number) {
  model.value = Math.max(props.min, round2(model.value + delta))
}

// Le champ renvoie du texte : on n'écrit dans le modèle que des NOMBRES valides.
function onInput(value: string | null) {
  const amount = Number(value)
  if (value !== null && value.trim() !== '' && Number.isFinite(amount)) model.value = amount
}
</script>

<template>
  <div class="d-flex align-center ga-2" data-testid="bid-amount">
    <v-btn
      icon="mdi-minus"
      variant="outlined"
      size="small"
      aria-label="Diminuer l’offre"
      :disabled="model - step < min"
      data-testid="bid-amount-decrease"
      @click="bump(-step)"
    />
    <v-text-field
      :model-value="model"
      :label="label"
      type="number"
      :min="min"
      :step="step"
      hide-details
      density="compact"
      data-testid="bid-amount-field"
      @update:model-value="onInput"
    />
    <v-btn
      icon="mdi-plus"
      variant="outlined"
      size="small"
      aria-label="Augmenter l’offre"
      data-testid="bid-amount-increase"
      @click="bump(step)"
    />
  </div>
</template>
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/components/BidAmountInput.vue"
grep -q 'À écrire' "$F" && { echo "BidAmountInput.vue contient encore « À écrire » : écrivez le composant."; exit 1; }
grep -q 'defineModel' "$F" || { echo "BidAmountInput.vue n'utilise pas defineModel : déclarez const model = defineModel<number>({ required: true })."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/components/BidAmountInput.spec.ts >/dev/null 2>&1) || { echo "Les tests du champ échouent : lancez « npx vitest run src/features/auctions/components/BidAmountInput.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il nomme le cas : pas de ± step, bouton « − » à désactiver sous le minimum, ou une saisie qui doit rester un nombre."; exit 1; }
echo "Le champ se branche en v-model, et son modèle reste un nombre valide."
```

> 📖 [Vue : `v-model` sur un composant et `defineModel`](https://vuejs.org/guide/components/v-model.html)

## 06.5 - Animer l'historique : `TransitionGroup`

L'historique des offres reçoit une ligne en tête à chaque offre. Sans animation, la liste « saute ». `TransitionGroup` anime les éléments d'un `v-for` : l'**entrée** d'une nouvelle ligne, la **sortie** d'une ancienne (l'historique est limité à 20 lignes) et le **déplacement** des autres, qui glissent au lieu de sauter. Il rend un élément racine choisi par `tag` (ici une `ul`) et applique des classes CSS dont le préfixe est son `name` :

| Classe (avec `name="bid"`) | Moment |
|---|---|
| `bid-enter-from` | l'état de départ d'une ligne qui entre (transparente, décalée) |
| `bid-enter-active`, `bid-leave-active`, `bid-move` | la transition elle-même (durée, courbe) |
| `bid-leave-to` | l'état d'arrivée d'une ligne qui sort |

Deux règles évitent les pièges. Chaque ligne doit avoir une **`key` stable et propre à l'élément** : la `version` de l'offre, jamais l'index, sinon l'insertion en tête ferait croire que chaque ligne a changé. Et une ligne qui **sort** doit passer en `position: absolute` : elle ne prend plus de place, les autres peuvent glisser pour la remplacer, et la classe `bid-move` anime ce glissement.

Ouvrez `src/features/auctions/components/BidHistory.vue`. La ligne `BidRow` est fournie : elle affiche l'enchérisseur, le montant, l'heure et une pastille « en tête » pour l'index 0.

**À vous** : écrivez l'historique.

**Critères :**

- sans offre : `<p data-testid="bid-history-empty">` avec « Aucune offre reçue depuis votre arrivée. » ;
- sinon `<TransitionGroup tag="ul" name="bid" data-testid="bid-history">` qui contient `<BidRow v-for="(bid, index) in bids" :key="bid.version" :bid="bid" :index="index" />` ;
- un bloc `<style scoped>` avec les classes `bid-enter-from`, `bid-enter-active`, `bid-leave-active`, `bid-leave-to` et `bid-move` (fondu et glissement, 0,3 s), et `position: absolute` sur `bid-leave-active`.

Deux remarques d'accessibilité : `transition: all` anime toutes les propriétés, ce qui est commode ici mais large ; et un produit réel désactiverait ces animations pour les personnes qui ont demandé moins de mouvement (media query `prefers-reduced-motion`). Le lab ne le fait pas.

```hint
`TransitionGroup` est enregistré globalement par Vue : pas d'import à faire. Pour la transition : `transition: all 0.3s ease` sur les classes `-enter-active`, `-leave-active` et `-move`, `opacity: 0` et `transform: translateY(-12px)` sur `bid-enter-from`.
```

````solution
```vue
<script setup lang="ts">
import type { BidEvent } from '@/shared/events'
import BidRow from './BidRow.vue'

// Les offres, la plus récente en premier. `TransitionGroup` anime l'arrivée, le départ et le
// déplacement des lignes : chacune doit avoir une `key` stable (la version de l'offre).
defineProps<{ bids: readonly BidEvent[] }>()
</script>

<template>
  <p v-if="bids.length === 0" data-testid="bid-history-empty">
    Aucune offre reçue depuis votre arrivée.
  </p>
  <TransitionGroup v-else tag="ul" name="bid" class="bid-history" data-testid="bid-history">
    <BidRow v-for="(bid, index) in bids" :key="bid.version" :bid="bid" :index="index" />
  </TransitionGroup>
</template>

<style scoped>
.bid-history {
  list-style: none;
  padding: 0;
  position: relative;
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
grep -q 'À écrire' "$F" && { echo "BidHistory.vue contient encore « À écrire » : écrivez l'historique."; exit 1; }
grep -q 'TransitionGroup' "$F" || { echo "BidHistory.vue n'utilise pas TransitionGroup : entourez les lignes d'un <TransitionGroup tag=\"ul\" name=\"bid\">."; exit 1; }
grep -q 'bid-move' "$F" || { echo "BidHistory.vue ne définit pas la classe bid-move : sans elle les lignes sautent au lieu de glisser."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/components/BidHistory.spec.ts >/dev/null 2>&1) || { echo "Les tests de l'historique échouent : lancez « npx vitest run src/features/auctions/components/BidHistory.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Les lignes sont clées par version, et une nouvelle offre s'ajoute en tête sans recréer les autres."; exit 1; }
echo "L'historique est animé, ses lignes sont clées par version."
```

> 📖 [Vue : `TransitionGroup`](https://vuejs.org/guide/built-ins/transition-group.html)

## 06.6 - Isoler une panne : la frontière d'erreur

Aujourd'hui, une erreur dans le rendu d'une page peut la rendre blanche, ou se perdre dans la console. On veut qu'une page qui plante soit **remplacée par un message**, avec un bouton pour réessayer, tandis que l'en-tête et le reste de l'application continuent de fonctionner. C'est le rôle d'une **frontière d'erreur**, que Vue permet d'écrire avec le hook `onErrorCaptured`.

Quand un composant lève une erreur, Vue la fait **remonter** de parent en parent. Chaque ancêtre qui a un hook `onErrorCaptured` la reçoit, avec le composant fautif et une chaîne `info` qui dit où elle est née (rendu, `setup`, gestionnaire d'événement…). Si un hook renvoie **`false`**, la remontée s'arrête : l'erreur est considérée comme traitée. Si personne ne l'arrête, elle arrive au gestionnaire global de l'application, `app.config.errorHandler`, que la section suivante écrit. Le hook ne voit que ce que Vue appelle lui-même (rendu, `setup`, hooks, observateurs, gestionnaires d'événements du gabarit) : les gestionnaires d'événements du gabarit, même asynchrones, sont couverts, mais une promesse lancée sans être attendue ou un `setTimeout` ne le sont pas.

Retenez une conséquence : en renvoyant `false`, la frontière **avale** l'erreur, qui n'atteint jamais le gestionnaire global ; la section suivante revient sur ce choix. Le composant `ErrorBoundary` garde donc l'erreur dans une `ref`, affiche son slot par défaut quand il n'y en a pas et un message de repli sinon. Il émet un événement `error` pour qui voudrait journaliser, et se **réarme** (`reset`) à la demande ou quand la prop `resetKey` change : l'application lui passera l'adresse de la page, pour qu'aller ailleurs efface l'erreur.

Ouvrez `src/components/common/ErrorBoundary.vue`.

**À vous** : écrivez la frontière.

**Critères :**

- `onErrorCaptured((err, _instance, info) => …)` mémorise l'erreur (un `Error`), émet `error` avec l'erreur et `info`, et renvoie `false` ;
- sans erreur, le slot par défaut ; avec une erreur, le slot nommé `fallback` qui reçoit `error` et `reset`, et, par défaut, un `<v-alert type="error" role="alert" data-testid="error-boundary">` avec le message et un bouton « Réessayer » (`data-testid="error-boundary-retry"`) qui appelle `reset` ;
- `reset` efface l'erreur, et un changement de `resetKey` l'appelle aussi (`watch`).

```hint
`const error = ref<Error | null>(null)`, puis dans le gabarit `<slot v-if="!error" />` et `<slot v-else name="fallback" :error="error" :reset="reset">…le repli par défaut…</slot>`. Une erreur levée n'est pas toujours un `Error` : `err instanceof Error ? err : new Error(String(err))`.
```

````solution
```vue
<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'

const props = defineProps<{
  /** Quand cette valeur change (ex. la route), la frontière se réarme. */
  resetKey?: unknown
}>()
const emit = defineEmits<{ error: [error: Error, info: string] }>()

const error = ref<Error | null>(null)

// Appelé pour toute erreur levée dans un descendant (rendu, setup, hooks, gestionnaires d'événements).
onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  emit('error', error.value, info)
  // `false` : l'erreur est traitée ici, elle ne remonte pas à `app.config.errorHandler`.
  return false
})

function reset() {
  error.value = null
}
watch(() => props.resetKey, reset)
</script>

<template>
  <slot v-if="!error" />
  <slot v-else name="fallback" :error="error" :reset="reset">
    <v-alert type="error" variant="tonal" role="alert" data-testid="error-boundary">
      Cette partie de la page a rencontré une erreur : {{ error.message }}
      <template #append>
        <v-btn variant="text" data-testid="error-boundary-retry" @click="reset">Réessayer</v-btn>
      </template>
    </v-alert>
  </slot>
</template>
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/components/common/ErrorBoundary.vue"
grep -q 'À écrire' "$F" && { echo "ErrorBoundary.vue contient encore « À écrire » : écrivez la frontière."; exit 1; }
grep -q 'onErrorCaptured' "$F" || { echo "ErrorBoundary.vue n'utilise pas onErrorCaptured : c'est le hook qui capte les erreurs des descendants."; exit 1; }
(cd "$D" && npx vitest run src/components/common/ErrorBoundary.spec.ts >/dev/null 2>&1) || { echo "Les tests de la frontière échouent : lancez « npx vitest run src/components/common/ErrorBoundary.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Le hook doit renvoyer false, et un changement de resetKey doit réarmer."; exit 1; }
echo "La frontière capte les erreurs de ses descendants et se réarme."
```

> 📖 [Vue : `onErrorCaptured`](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) · [Vue : `app.config.errorHandler`](https://vuejs.org/api/application.html#app-config-errorhandler)

## 06.7 - Le dernier filet, puis le branchement de l'application

Une erreur qu'**aucune frontière** n'a attrapée (celle d'un composant placé hors de la frontière, ou une erreur levée par le rendu de la frontière elle-même) arrive au gestionnaire global `app.config.errorHandler`. Ce doit être un filet de dernier recours : il **journalise** l'erreur pour qu'on la retrouve, et il **prévient** l'utilisateur par le service de notifications de l'étape 03, au lieu de la laisser passer en silence.

Une limite à connaître : la frontière de la section précédente renvoie `false`, donc **ce qu'elle capte n'arrive jamais ici**, et `App.vue` n'écoute pas son événement `error`. Dans ce lab, une erreur de page capturée est donc affichée à l'utilisateur mais ni journalisée ni notifiée. Dans une application réelle, on écouterait `@error` sur la frontière pour l'envoyer à un service de suivi ; le lab s'arrête avant.

Ouvrez `src/plugins/errorHandler.ts`. Les types sont fournis.

**À vous** : écrivez `createErrorHandler` et `installErrorHandler`, puis supprimez la première ligne du fichier (le commentaire `eslint-disable`).

**Critères :**

- `createErrorHandler(notify)` renvoie un gestionnaire `(error, instance, info)` qui appelle `console.error` avec le message `[app] erreur non gérée (${info})` et l'erreur, puis `notify.notify('Une erreur inattendue est survenue.', 'error')` ;
- `installErrorHandler(app, notify)` pose ce gestionnaire sur `app.config.errorHandler`.

```hint
Le gestionnaire reçoit trois paramètres, dont seuls `error` et `info` servent. Un paramètre qu'on n'utilise pas se préfixe d'un tiret bas (`_instance`) pour ESLint.
```

````solution
```ts
export function createErrorHandler(
  notify: Pick<NotifyApi, 'notify'>,
): NonNullable<App['config']['errorHandler']> {
  return (error, _instance, info) => {
    console.error(`[app] erreur non gérée (${info})`, error)
    notify.notify('Une erreur inattendue est survenue.', 'error')
  }
}

export function installErrorHandler(app: App, notify: Pick<NotifyApi, 'notify'>) {
  app.config.errorHandler = createErrorHandler(notify)
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/plugins/errorHandler.ts"
grep -q 'À écrire' "$F" && { echo "errorHandler.ts contient encore « À écrire » : écrivez createErrorHandler et installErrorHandler."; exit 1; }
head -1 "$F" | grep -q 'eslint-disable' && { echo "Supprimez la première ligne de errorHandler.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/plugins/errorHandler.spec.ts >/dev/null 2>&1) || { echo "Les tests du gestionnaire échouent : lancez « npx vitest run src/plugins/errorHandler.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il doit journaliser avec console.error et notifier avec le niveau error."; exit 1; }
echo "Une erreur non gérée est journalisée et signalée."
```

Les deux pièces existent ; il reste à les brancher, dans deux fichiers existants que vous **modifiez à la main** : `src/main.ts` et `src/App.vue`. Commencez par `main.ts`. Votre fichier est celui de la section 04.7 : il crée `app`, `pinia`, `notify` (le service de l'étape 03, dont `notify.api` est l'API appelable hors d'un composant) et `queryClient`, installe les plugins, puis enregistre la directive. Vous y faites **deux ajouts**, marqués ci-dessous ; le reste ne bouge pas.

```ts
import { vCountdown } from './directives/countdown'
import { installErrorHandler } from './plugins/errorHandler' // ajout 1 : avec les autres imports
// … (createApp, pinia, notify, queryClient, app.use(...) : inchangés)
app.directive('countdown', vCountdown)
// Dernier filet : toute erreur qu'aucune frontière n'a attrapée est journalisée et signalée.
installErrorHandler(app, notify.api) // ajout 2 : juste après la directive
```

Passez à `App.vue`. À la fin de l'étape 05, votre fichier est la coque suivante (si vous y avez ajouté autre chose, gardez-le) :

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

Il y a **deux ajouts** : dans `<script setup>`, l'import de `useRoute` et d'`ErrorBoundary`, puis la ligne `const route = useRoute()` ; dans le gabarit, `<RouterView />` est entouré de la frontière, réarmée par l'adresse courante (`route.fullPath`).

| Où | Ajout |
|---|---|
| `<script setup>`, avant les imports existants | `import { useRoute } from 'vue-router'` |
| `<script setup>`, après les imports existants | `import ErrorBoundary from '@/components/common/ErrorBoundary.vue'` puis `const route = useRoute()` |
| `<template>`, autour de `<RouterView />` | `<ErrorBoundary :reset-key="route.fullPath">` avant, `</ErrorBoundary>` après |

````solution
`main.ts` : l'import `import { installErrorHandler } from './plugins/errorHandler'` et, après `app.directive('countdown', vCountdown)`, la ligne `installErrorHandler(app, notify.api)`. `App.vue` :

```vue
<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import NotifyHost from '@/components/layout/NotifyHost.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

const route = useRoute()
</script>

<template>
  <v-app>
    <AppHeader />
    <v-main>
      <v-container>
        <ErrorBoundary :reset-key="route.fullPath">
          <RouterView />
        </ErrorBoundary>
      </v-container>
    </v-main>
    <NotifyHost />
  </v-app>
</template>
```
````

```verify
D=~/byte-layers/vue/shop
grep -q 'installErrorHandler(app' "$D/src/main.ts" || { echo "main.ts n'installe pas le gestionnaire d'erreurs : ajoutez installErrorHandler(app, notify.api) après app.directive('countdown', vCountdown)."; exit 1; }
grep -q 'ErrorBoundary' "$D/src/App.vue" || { echo "App.vue n'utilise pas ErrorBoundary : entourez <RouterView /> de la frontière, comme dans la section 06.7."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "Les erreurs sont isolées par page, et le dernier filet est installé."
```

## 06.8 - Téléporter la modale

La fenêtre de mise est aujourd'hui un `v-dialog`. Pour la reprendre en main, on l'écrit à la main avec **`Teleport`**. Une modale écrite à l'intérieur d'une carte, d'une grille ou d'une zone qui défile hérite de leurs contextes d'empilement et de leurs `overflow` : elle peut être coupée ou passer sous un autre élément. `<Teleport to="#modals">` **déplace ses enfants dans le DOM**, sous l'élément cible, tout en les laissant **dans l'arbre de composants** : les props, les événements, `provide` et `inject` fonctionnent comme si de rien n'était. Le socket de `useBid` y est donc retrouvé sans rien changer.

La cible doit **exister** quand la modale s'affiche, sinon rien n'est rendu. On la place dans `App.vue`, **à l'intérieur de `<v-app>`** : le thème de Vuetify (couleurs, polices) s'applique à ce qui est dans l'élément racine de l'application, pas dans `index.html` : hors de `<v-app>` la carte perdrait ses couleurs. Dans `src/App.vue`, ajoutez la ligne suivante juste après `<NotifyHost />`, avant `</v-app>` :

```vue
<div id="modals" />
```

Cette modale écrite à la main fait moins qu'un `v-dialog`, et il faut le savoir. Elle gère les points du tableau ci-dessous, mais **pas** le piège de focus (avec `aria-modal="true"`, la touche `Tab` peut encore sortir de la fenêtre vers la page) ni le verrouillage du défilement de la page derrière. Pour un produit réel, deux pistes : l'élément natif `<dialog>` ouvert avec `showModal()`, qui apporte le piège de focus et la couche supérieure, ou l'attribut `inert` posé sur le reste de la page pendant que la modale est ouverte. Ici on reste volontairement sur `Teleport` : c'est lui que l'exercice enseigne.

| Exigence | Réalisation |
|---|---|
| un lecteur d'écran sait que c'est une fenêtre modale | `role="dialog"` et `aria-modal="true"` sur la carte |
| elle a un nom | `aria-labelledby` pointe vers l'`id` du titre ; `useId()` (Vue 3.5, version du projet) fournit un identifiant unique |
| Échap la ferme | un écouteur sur `document`, **retiré** au démontage |
| le clavier y entre | à l'ouverture, le focus va sur la fenêtre (un élément avec `tabindex="-1"`) |
| on n'est pas perdu en la fermant | à la fermeture, le focus **revient** à l'élément qui l'avait avant (le bouton « Enchérir ») |
| un clic dehors la ferme | un fond (`backdrop`) qui émet `close` seulement s'il est cliqué lui-même (`@click.self`) |

**Critères :**

- le contenu est téléporté dans `#modals` (et non dans la page) ; la carte a `role="dialog"`, `aria-modal="true"` et un `aria-labelledby` qui désigne son titre ;
- Échap, le bouton « Fermer » et un clic sur le fond émettent `close` (un clic **dans** la fenêtre non) ; après le démontage, Échap n'émet plus rien ;
- le focus entre dans la fenêtre à l'ouverture et revient à l'élément précédent à la fermeture ;
- le champ d'offre est un `BidAmountInput` en `v-model` (un clic sur « + » passe de 465 à 470), l'historique un `BidHistory`, et l'offre part toujours avec `expectedVersion`.

Ouvrez `src/features/auctions/components/AuctionModal.vue`. Elle contient la fenêtre `v-dialog` de l'étape 05, précédée d'un commentaire `TODO` : supprimez ce commentaire (les lignes `//` en tête de `<script setup>`). Les noms déjà définis dans son script (`emit`, `minimum`, `amount`, `history`, `closed`, `submit`) servent tels quels. Le parent (`AuctionsPage`) monte la modale avec un `v-if` : elle est donc créée à l'ouverture et détruite à la fermeture, ce que le code de focus ci-dessous suppose. Faites ensuite **cinq modifications**, dans cet ordre.

**1. Les imports.** Remplacez les deux lignes d'import concernées, et ajoutez les deux imports de composants.

| Avant | Après |
|---|---|
| `import { computed, ref, watch } from 'vue'` | `import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'` |
| `import { useBidRules } from '../useBidRules'` | `import { BID_STEP, useBidRules } from '../useBidRules'` |
| (à la suite des imports) | `import BidAmountInput from './BidAmountInput.vue'` et `import BidHistory from './BidHistory.vue'` |

**2. L'accessibilité, dans `<script setup>`.** Ajoutez ce bloc juste après la ligne `const history = useBidHistory(…)` : l'identifiant du titre, la référence de la fenêtre, le focus et la touche Échap.

```ts
const titleId = useId()
const dialog = ref<HTMLElement | null>(null)

// Accessibilité d'une modale native : le focus entre dedans, Échap la ferme, le focus revient où il était.
const opener = document.activeElement as HTMLElement | null
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  dialog.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  opener?.focus?.()
})
```

**3. L'enveloppe du gabarit.** Au début de `<template>`, les trois lignes `<v-dialog …>`, `<v-card data-testid="auction-modal" :title="auction.title">` et `<v-card-text>` sont remplacées par ce bloc (le contenu de la carte, du prix jusqu'au bouton « Fermer », ne change pas).

```vue
  <!-- Téléportée dans #modals (voir App.vue), hors de la page : pas de z-index ni d'overflow du parent. -->
  <Teleport to="#modals">
    <div class="modal-backdrop" data-testid="auction-modal-backdrop" @click.self="emit('close')">
      <v-card
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="modal-card"
        data-testid="auction-modal"
      >
        <div ref="dialog" tabindex="-1" class="modal-focus">
          <v-card-title :id="titleId">{{ auction.title }}</v-card-title>
          <v-card-text>
```

À la fin du gabarit, les deux lignes `</v-card>` et `</v-dialog>` qui suivent `</v-card-actions>` sont remplacées par les fermetures de l'enveloppe.

```vue
        </div>
      </v-card>
    </div>
  </Teleport>
```

**4. Les deux composants.** Le `v-text-field v-model.number="amount"` (avec ses attributs `label`, `type`, `:min`, `step` et son `data-testid`) est remplacé par le champ en `v-model` ; le paragraphe « Aucune offre reçue… » et la liste `<ul>` de l'historique, écrits à la main sous le titre « Dernières offres », sont remplacés par la ligne `<BidHistory>`.

```vue
<BidAmountInput
  v-model="amount"
  :min="minimum"
  :step="BID_STEP"
  data-testid="auction-modal-amount"
/>
```

Et l'historique :

```vue
<BidHistory :bids="history" />
```

**5. Le style.** Ajoutez à la fin du fichier ce bloc, qui fixe le fond sur tout l'écran, au-dessus du reste (`z-index` élevé). Le contour du focus est retiré sur la fenêtre elle-même, qui n'est pas un contrôle : ne le retirez jamais d'un bouton ou d'un champ.

```vue
<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 50%);
}
.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-focus:focus {
  outline: none;
}
</style>
```

```hint
Si la modale s'affiche sans couleurs ou pas du tout, vérifiez la cible : `<div id="modals" />` doit être **dans** `<v-app>` de `App.vue`. Si un clic dans la fenêtre la ferme, le fond doit porter `@click.self` et non `@click`.
```

````solution
Le fichier complet est dans le kit : [AuctionModal.vue](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/06/src/features/auctions/components/AuctionModal.vue), ou dans `~/byte-layers/vue/course/kit/solutions/06/src/features/auctions/components/AuctionModal.vue`. La cible est la ligne `<div id="modals" />` de `src/App.vue`, juste avant `</v-app>`.
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/components/AuctionModal.vue"
grep -q '^// TODO' "$F" && { echo "AuctionModal.vue contient encore le commentaire TODO en tête de <script setup> : supprimez-le une fois la modale réécrite."; exit 1; }
grep -q '<Teleport' "$F" || { echo "AuctionModal.vue n'utilise pas Teleport : enveloppez le gabarit dans <Teleport to=\"#modals\">."; exit 1; }
grep -q 'id="modals"' "$D/src/App.vue" || { echo "App.vue n'a pas la cible des modales : ajoutez <div id=\"modals\" /> dans <v-app>, juste avant </v-app>."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/components/AuctionModal.spec.ts >/dev/null 2>&1) || { echo "Les tests de la modale échouent : lancez « npx vitest run src/features/auctions/components/AuctionModal.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il nomme le point : contenu dans #modals, rôle dialog, Échap, focus rendu."; exit 1; }
(cd "$D" && npx vitest run src/App.spec.ts >/dev/null 2>&1) || { echo "Les tests de l'application échouent : lancez « npx vitest run src/App.spec.ts » dans ~/byte-layers/vue/shop. Ils attendent #modals dans v-app, la frontière autour de RouterView, et son réarmement par la route."; exit 1; }
echo "La modale est téléportée, accessible au clavier, et la page est protégée par sa frontière."
```

> 📖 [Vue : `Teleport`](https://vuejs.org/guide/built-ins/teleport.html) · [Vue : `useId` (Vue 3.5)](https://vuejs.org/api/composition-api-helpers.html#useid) · [WAI-ARIA : le motif « dialog (modal) »](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · [MDN : l'élément `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)

## 06.9 - Les composants dans le navigateur

Pour cette section, trois terminaux : le terminal **Serveur** (le serveur d'enchères), le terminal **Application** (`npm run dev`) et un terminal **Commandes** pour les `curl`. Si le serveur de l'étape 05 tourne encore dans son terminal, laissez-le ; sinon relancez-le comme à l'étape 05. Même chose pour l'application.

```exec
label: "Serveur d'enchères (laisser tourner)"
---
cd ~/byte-layers/vue/course/kit/server && BOTS=off npm start
```

Puis l'application, dans le terminal Application :

```exec
label: "Application (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

Les essais de l'étape 05 ont fait monter l'iPhone à 1 000 €. Pour que les montants de cette section soient vrais, remettez les enchères à zéro depuis le terminal Commandes : le serveur renvoie la liste, et la page se met à jour toute seule.

```exec
curl -X POST localhost:4310/control/reset
```

Faites ces essais, dans l'ordre :

**La grille.** Ouvrez `http://localhost:5173/products` : le catalogue s'affiche comme avant, 12 cartes. Dans l'onglet Elements des outils de développement, la grille porte `data-testid="product-list"` (celui que la page donne à `ProductGrid`, qui remplace celui de sa racine), et chaque carte est dans un élément `data-testid="product-grid-cell"`.

**La modale téléportée.** Ouvrez `/auctions` et cliquez sur « Enchérir » sur l'iPhone (450 €). Dans l'onglet Elements, la fenêtre (`role="dialog"`) n'est **pas** dans la page, mais dans `<div id="modals">`, à l'intérieur de l'élément `.v-application`. Le focus est dans la fenêtre.

**Le champ en `v-model`.** L'offre est préremplie à 455. Cliquez sur « + » : elle passe à 460, et le bouton « − » est désactivé à 455 (le minimum). Tapez `abc` ou videz le champ : le montant ne devient jamais invalide.

**L'historique animé.** Cliquez sur « Enchérir » dans la fenêtre : une ligne arrive **en tête** en glissant. Depuis le terminal Commandes, faites miser un bot et regardez la nouvelle ligne repousser les autres.

```exec
curl -X POST localhost:4310/control/bot-bid -H 'Content-Type: application/json' -d '{"productId":123,"amount":800}'
```

**Le focus rendu.** Appuyez sur `Échap` : la fenêtre se ferme, et le focus est revenu sur le bouton « Enchérir » de la carte de l'iPhone (il a le contour du focus).

```acknowledge
J'ai vu la modale dans #modals, le champ en v-model et l'historique glisser, puis le focus revenir sur le bouton
```

**La frontière d'erreur.** Dans `src/features/products/pages/ProductListPage.vue`, ajoutez provisoirement `throw new Error('essai de la frontière')` comme première ligne de la fonction `refreshCatalog` (le bouton « Actualiser » vient de l'étape 04). Sur `/products`, cliquez sur « Actualiser » : la liste est remplacée par une alerte rouge « Cette partie de la page a rencontré une erreur : essai de la frontière » avec « Réessayer », **et l'en-tête reste en place**. Cliquez sur « Enchères » dans l'en-tête : la page des enchères s'affiche, la frontière s'est réarmée avec la route. Puis **supprimez la ligne ajoutée** et enregistrez : le bouton ci-dessous contrôle qu'elle a bien disparu.

```acknowledge
J'ai vu la frontière isoler la page en erreur, l'en-tête rester en place, puis j'ai supprimé la ligne throw
```

```verify
D=~/byte-layers/vue/shop
grep -q "essai de la frontière" "$D/src/features/products/pages/ProductListPage.vue" && { echo "Il reste la ligne « throw new Error('essai de la frontière') » dans ProductListPage.vue : supprimez-la, c'était un essai provisoire (elle fait aussi échouer le lint)."; exit 1; }
echo "La ligne d'essai a été retirée."
```

## 06.10 - Tout vérifier d'un coup

Avant de passer à la suite, il faut que les trois commandes de qualité passent : `npm run type-check`, `npm run lint` et `npm test` (toute la suite, qui lance aussi les tests de types : le résumé de Vitest doit finir par `Type Errors  no errors`). Le bouton ci-dessous les lance pour vous, dans cet ordre, et s'arrête au premier échec.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Un fichier écrit garde souvent la première ligne eslint-disable, ou un import inutilisé."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent : l'application est dans l'état de fin d'étape 06."
```

## 06.11 - Option (+40 min) : le checkout avec VeeValidate et Zod

> **Cette section est facultative.** Elle ajoute environ 40 minutes (sections 06.11 à 06.14) et se joue **entièrement à part** : les étapes 07 et 08 sont indépendantes de l'option, et aucune section précédente ne la suppose. Un effet en aval, pourtant : les rattrapages `catch-up.sh 06` à `08` **contiennent** l'option, et les totaux de tests de 07 et 08 la comptent. Si vous l'avez sautée, vous pouvez donc lancer `catch-up.sh 06` avant l'étape 07 pour aligner votre application sur ces totaux (il écrase vos fichiers du même nom, et installe `vee-validate`). Pour la sauter, passez directement à la section 06.15 (le récap). Le rattrapage `sh ~/byte-layers/vue/course/kit/catch-up.sh 06`, comme ceux des étapes suivantes, **contient l'option complète** (page de commande, route, bouton du panier, tests verts) : sauter l'option ne vous prive de rien. Décidez **avant** de copier les fichiers ci-dessous, et committez d'abord votre travail de l'étape (le dépôt `shop` est versionné depuis l'étape 01). Si vous renoncez après la copie, avant d'avoir écrit l'adaptateur, `npm test` restera rouge (un squelette `À écrire`) : revenez en arrière avec `git restore .` (ou `git checkout -- .`) puis `git clean -fd src/features/checkout`, qui annulent la copie (fichiers modifiés, puis nouveaux fichiers) et conservent votre commit. Ne lancez pas `catch-up.sh 06` pour cela : il écrase aussi le travail de **tous** les squelettes de l'étape 06.

On ajoute une page `/checkout` : un formulaire de commande dont les règles de validation sont décrites **une seule fois**, avec un schéma Zod, et dont **VeeValidate** gère l'état (valeurs, erreurs, soumission). **Support** d'abord : copiez les fichiers de l'option. Ils **remplacent** `src/router/index.ts` (la route `/checkout`, réservée aux personnes connectées par la garde de l'étape 03) et la page du panier (un bouton « Passer commande ») ; committez d'abord si vous avez modifié ces fichiers.

```exec
cp -R ~/byte-layers/vue/course/kit/steps/06-option/. ~/byte-layers/vue/shop/
```

Installez VeeValidate, avec une version fixée.

```exec
cd ~/byte-layers/vue/shop && npm install -E vee-validate@4.15.1
```

Un mot sur ce qui **n'est pas** installé : `@vee-validate/zod`, le paquet officiel qui relie les deux bibliothèques, déclare une dépendance sur Zod 3, et le projet utilise Zod 4 (installé à l'étape 04). Il ne s'installe pas proprement ; il reste donc un adaptateur d'une quinzaine de lignes à écrire, et c'est un bon exercice : il montre ce que VeeValidate attend d'un schéma. Voici ce que contient la copie.

| Fichier fourni (sous `src/features/checkout/`) | Nature |
|---|---|
| `toVeeSchema.ts` | squelette : l'adaptateur Zod vers VeeValidate |
| `checkoutSchema.ts` | fourni : le schéma Zod du formulaire (nom, e-mail, adresse, code postal à 5 chiffres, ville, livraison, conditions) |
| `pages/CheckoutPage.vue`, `routes.ts` | fournis : la page et sa route |
| `toVeeSchema.spec.ts`, `pages/CheckoutPage.spec.ts` | les tests |

## 06.12 - L'adaptateur Zod vers VeeValidate

VeeValidate accepte un schéma de validation sous la forme d'un objet « TypedSchema » : un objet qui porte la marque `__type: 'VVTypedSchema'` et une méthode `parse(valeurs)`. Celle-ci rend `{ value, errors }`, où `errors` est une liste de `{ path, errors: [messages] }` : **un élément par champ**, avec tous ses messages. Zod, lui, rend une liste plate de problèmes (`issues`), chacun avec un `path` (un tableau) et un `message`. L'adaptateur regroupe donc les problèmes par champ, et rend `{ value: données validées, errors: [] }` quand tout est valide : les transformations de Zod (comme `trim`) s'y retrouvent.

Ouvrez `src/features/checkout/toVeeSchema.ts`.

**À vous** : écrivez `toVeeSchema`.

**Critères :**

- l'objet rendu porte `__type: 'VVTypedSchema'` et une méthode `parse` asynchrone qui utilise `schema.safeParseAsync(values)` ;
- en cas de succès : `{ value: result.data, errors: [] }` ;
- en cas d'échec : `{ errors: [{ path, errors: [messages] }] }`, les problèmes de `result.error.issues` regroupés par chemin (`issue.path.join('.')`, les messages dans l'ordre d'arrivée).

```hint
Regroupez avec une `Map<string, string[]>` : `byPath.set(path, [...(byPath.get(path) ?? []), issue.message])`, puis `[...byPath].map(([path, errors]) => ({ path, errors }))`.
```

````solution
```ts
export function toVeeSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      // zod donne une liste de problèmes ; VeeValidate veut les messages groupés par champ.
      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        byPath.set(path, [...(byPath.get(path) ?? []), issue.message])
      }
      return { errors: [...byPath].map(([path, errors]) => ({ path, errors })) }
    },
  }
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/checkout/toVeeSchema.ts"
grep -q 'À écrire' "$F" && { echo "toVeeSchema.ts contient encore « À écrire » : écrivez l'adaptateur."; exit 1; }
grep -q 'VVTypedSchema' "$F" || { echo "L'adaptateur doit porter la marque __type: 'VVTypedSchema' : sans elle VeeValidate ne reconnaît pas le schéma."; exit 1; }
(cd "$D" && npx vitest run src/features/checkout/toVeeSchema.spec.ts >/dev/null 2>&1) || { echo "Les tests de l'adaptateur échouent : lancez « npx vitest run src/features/checkout/toVeeSchema.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Les messages se groupent par champ, dans l'ordre, et les valeurs rendues sont celles que zod a transformées."; exit 1; }
echo "L'adaptateur traduit les erreurs de zod dans le format de VeeValidate."
```

> 📖 [VeeValidate : schémas typés](https://vee-validate.logaretm.com/v4/guide/composition-api/typed-schema/) · [Zod : référence des schémas](https://zod.dev/api)

## 06.13 - Le formulaire dans le navigateur

La page `CheckoutPage.vue` est fournie. Lisez-la avant de l'essayer : `useForm({ validationSchema: toVeeSchema(checkoutSchema) })` donne le formulaire, et `defineField('email', config)` renvoie la valeur du champ et ses attributs à brancher (ici `error-messages`, que Vuetify affiche sous le champ). La validation se fait **à la sortie du champ** et non à chaque frappe, grâce à `validateOnModelUpdate: false` et `validateOnChange: false` : on ne reproche pas son e-mail incomplet à quelqu'un qui est en train de le taper. `handleSubmit` n'appelle la fonction de commande que si le schéma accepte **toutes** les valeurs. Le type des valeurs vient du schéma (`z.input` pour la saisie, `z.output` pour le résultat) : une seule description, pas deux.

Essayez-la, dans le navigateur, avec le serveur et l'application lancés :

1. Sur `/products`, ajoutez un produit au panier, ouvrez le panier et cliquez sur « Passer commande ». Sans session, vous arrivez sur `/login?redirect=/checkout` : c'est la garde de l'étape 03, qui passe l'adresse demandée dans le paramètre `redirect`. Connectez-vous avec `emilys` et `emilyspass` ; vous revenez sur `/checkout`, où le nom est prérempli « Emily Johnson ».
2. Cliquez sur « Commander » sans rien remplir : **cinq** messages apparaissent (e-mail invalide, adresse, code postal à 5 chiffres, ville, conditions de vente) et « 5 champ(s) à corriger. » s'affiche sous le bouton.
3. Tapez `12` dans « Code postal » : aucun message tant que vous ne **quittez** pas le champ. Corrigez-le avec `31000`, remplissez les autres champs, cochez les conditions de vente et commandez : une confirmation « Commande CMD-… enregistrée (simulée : DummyJSON ne conserve rien) » remplace le formulaire, et le panier est vidé.

```acknowledge
J'ai vu les cinq messages d'erreur, la validation à la sortie du champ, puis la commande confirmée
```

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/features/checkout/pages/CheckoutPage.spec.ts >/dev/null 2>&1) || { echo "Les tests de la page de commande échouent : lancez « npx vitest run src/features/checkout/pages/CheckoutPage.spec.ts » dans ~/byte-layers/vue/shop. Ils s'appuient sur votre adaptateur : relisez la section 06.12 si toVeeSchema.spec.ts n'est pas vert."; exit 1; }
echo "La page de commande valide les saisies avec le schéma Zod."
```

## 06.14 - Après l'option : tout revérifier

L'option a ajouté des fichiers, des tests et une dépendance : relancez les trois commandes de qualité, comme à la section 06.10.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint » et lisez la première erreur."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec. Si un squelette de l'option contient encore « À écrire », terminez la section 06.12, ou lancez sh ~/byte-layers/vue/course/kit/catch-up.sh 06 pour récupérer l'option complète."; exit 1; }
echo "Avec ou sans l'option, type-check, lint et tests passent : l'application est dans l'état de fin d'étape 06."
```

## 06.15 - Récap

- Un composant **générique** (`generic="T extends { id: number }"`) laisse TypeScript déduire `T` de ses props, et `defineSlots` type explicitement les **slots à portée** avec ce même `T` : dans `#item="{ item }"`, une faute de frappe devient une erreur du type-check.
- `defineModel` remplace la prop `modelValue` et l'événement `update:modelValue` par **une ref** : le composant se branche en `v-model`, avec une seule source de vérité, celle du parent.
- `TransitionGroup` anime l'entrée, la sortie et le déplacement des lignes d'un `v-for`, à condition d'une `key` stable (la `version`, pas l'index) et d'une ligne sortante en `position: absolute`.
- `onErrorCaptured` écrit une **frontière d'erreur** : renvoyer `false` arrête la remontée, ce qui veut dire que le dernier filet `app.config.errorHandler` ne voit pas ce que la frontière capte (écouter `@error` serait la suite en production).
- `Teleport` déplace la modale dans le DOM (sous `#modals`, dans `<v-app>` pour garder le thème) sans la sortir de l'arbre de composants ; une modale écrite à la main gère `role="dialog"`, `aria-modal`, `aria-labelledby`, Échap et le focus, mais pas le piège de focus : `<dialog>` ou `inert` sont la suite.
- Option, si vous l'avez faite : un schéma Zod décrit le formulaire une fois, un petit adaptateur le rend lisible par VeeValidate, et les erreurs s'affichent à la sortie du champ.

L'étape suivante change de regard : au lieu d'écrire, on **mesure**. Un serveur qui envoie dix offres par seconde montrera combien de rendus coûte l'historique que vous venez d'animer, et ce qu'on peut faire sans deviner.
