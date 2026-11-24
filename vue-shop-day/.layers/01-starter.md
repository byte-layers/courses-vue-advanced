---
title: "01 - Le starter et son tour"
description: "Cloner le kit, installer et lancer la boutique de départ, choisir entre DummyJSON et le serveur local, puis la parcourir : conventions du projet, catalogue chargé à la demande, panier en Provide/Inject, Devtools."
---

Vous allez passer la journée sur une même application : une boutique Vue 3 branchée sur une API de produits, à laquelle les huit étapes ajoutent de la réactivité maison, un état serveur, des enchères en temps réel, des composants avancés, des mesures et des tests. Cette première étape ne vous fait rien écrire : elle installe le point de départ, puis le fait visiter, pour que vous sachiez où vous poserez chaque fichier ensuite.

> **Contrat de niveau.** Ce lab s'adresse à des développeurs web **expérimentés** : TypeScript à l'aise, plusieurs années de framework front. Vous avez déjà vu les fondamentaux de Vue (le tutoriel officiel, `create-vue`, Vuetify, le routage, Pinia en survol). Le texte est du Vue pur, dense et direct. Il ne vous explique pas ce qu'est un composant, mais chaque notion nouvelle est dite avant la commande qui s'en sert, et chaque geste sur un fichier (créer, remplacer, supprimer) est écrit en toutes lettres. Le principe : le concept avant la commande, le pourquoi avant le comment.

Cette étape est un **support** : chaque geste est un bloc `exec` que le bouton ▶ lance, et vous pouvez la jouer sans tout comprendre avant de lire la visite. Elle n'a ni exercice ni solution, donc pas d'état de rattrapage : si quelque chose se passe mal, relancez le bloc concerné.

**Ce qu'il faut** :

- **Node.js 22.22 ou plus récent** (22.18 est le minimum pour le serveur du lab, qui exécute du TypeScript sans étape de build ; avant 22.22, `npm install` affiche des avertissements `EBADENGINE` sans conséquence). [Téléchargement](https://nodejs.org/en/download) ;
- **Git**. [Téléchargement](https://git-scm.com/downloads) ;
- un navigateur basé sur Chromium ou Firefox, pour les Devtools de Vue ;
- un éditeur de code (VS Code, par exemple), avec la possibilité d'ouvrir un dossier.

Sous Windows, tapez les commandes dans le terminal **Git Bash**, livré avec Git.

Tout vit dans `~/byte-layers/vue` : `course` contient le dépôt du lab (le kit), `shop` contiendra votre application. Pour tout effacer à la fin de la journée, supprimez ce dossier.

## 01.1 - Vérifier Node et Git

Ce premier contrôle vérifie que Node a au moins la version 22 et que Git répond :

```verify
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' || { echo "Node $(node -v) est trop ancien : installez Node 22.22 ou plus récent."; exit 1; }
git --version >/dev/null 2>&1 || { echo "Git n'est pas installé : installez-le puis rouvrez le terminal."; exit 1; }
echo "Node $(node -v) et Git sont disponibles."
```

## 01.2 - Cloner le kit du lab

Le kit regroupe tout ce que le lab vous fournit : le starter (`kit/app`), les squelettes et les tests de chaque étape (`kit/steps`), l'état de fin de chaque étape pour se rattraper (`kit/solutions`) et le serveur du lab (`kit/server`). Clonez le dépôt dans `~/byte-layers/vue/course`, sauf si le dossier est déjà là :

```exec
[ -d ~/byte-layers/vue/course/kit ] || git clone https://github.com/byte-layers/courses-vue-advanced ~/byte-layers/vue/course
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `[ -d ~/byte-layers/vue/course/kit ]` | teste si le dossier `kit` existe déjà dans le clone |
> | `\|\|` | n'exécute la suite que si le test précédent a échoué : on ne clone pas deux fois |
> | `git clone <adresse> <dossier>` | copie le dépôt dans le dossier donné, en créant les dossiers parents |

```verify
C=~/byte-layers/vue/course
[ -f "$C/kit/app/package.json" ] && [ -f "$C/kit/server/package.json" ] && [ -f "$C/kit/catch-up.sh" ] || { echo "Le kit n'est pas dans $C : relancez la commande de la section 01.2."; exit 1; }
echo "Le kit du lab est dans $C."
```

## 01.3 - Copier le starter et installer ses dépendances

Votre application ne doit pas vivre dans le clone : vous la modifierez toute la journée, et le clone doit rester intact pour les rattrapages. Copiez donc le starter dans `~/byte-layers/vue/shop`, qui devient votre projet :

```exec
mkdir -p ~/byte-layers/vue/shop && cp -R ~/byte-layers/vue/course/kit/app/. ~/byte-layers/vue/shop/
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `mkdir -p …/shop` | crée le dossier de l'application, sans erreur s'il existe déjà |
> | `&&` | n'enchaîne que si la commande précédente a réussi |
> | `cp -R …/kit/app/. …/shop/` | copie récursivement le contenu de `kit/app`, fichiers cachés compris (le `.` final) |

Installez ensuite les dépendances. Les versions sont figées dans `package.json` et `package-lock.json` : tout le monde travaille avec les mêmes.

```exec
cd ~/byte-layers/vue/shop && npm install
```

`npm install` signale cinq vulnérabilités « moderate » : elles viennent de la chaîne d'outils de test (`@vue/test-utils`), pas du code livré, et ne concernent pas ce lab. Ne lancez pas `npm audit fix --force` : il rétrograderait des paquets dont les étapes dépendent.

```verify
D=~/byte-layers/vue/shop
[ -f "$D/package.json" ] && [ -f "$D/src/main.ts" ] || { echo "Le starter n'est pas copié dans $D : relancez la première commande de la section 01.3."; exit 1; }
[ -d "$D/node_modules/vue" ] && [ -d "$D/node_modules/vuetify" ] || { echo "Les dépendances ne sont pas installées : lancez npm install dans $D."; exit 1; }
echo "Le starter est copié et ses dépendances sont installées."
```

## 01.4 - Lancer la boutique

Lancez le serveur de développement de Vite. Il reste ouvert : laissez ce terminal tourner, et ouvrez-en un autre pour la suite.

```exec
label: "Boutique (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

Ouvrez <http://localhost:5173>. Vous arrivez sur l'accueil (le routeur redirige `/` vers `/home`). Cliquez sur **Produits** : douze cartes apparaissent, avec leur image et leur prix. Cliquez trois fois sur **Ajouter au panier** sur une carte : la pastille de l'icône de panier, en haut à droite, affiche 3. Ouvrez le panier : les trois unités forment une seule ligne, avec ses boutons plus, moins et supprimer, et un total.

Deux accidents sont possibles au premier démarrage :

- Vite 8 optimise les dépendances au premier lancement. Si la console du navigateur affiche `504 (Outdated Optimize Dep)` ou `Failed to fetch dynamically imported module`, **rechargez la page** ; si cela persiste, arrêtez `npm run dev` (Ctrl+C) et relancez-le.
- Si le port 5173 est déjà pris, Vite choisit 5174 sans insister : lisez l'adresse affichée dans le terminal, ou forcez le port avec `npm run dev -- --port 5173 --strictPort`.

```verify
curl -fs http://localhost:5173/ | grep -q 'id="app"' || { echo "Rien ne répond sur http://localhost:5173 : lancez le bloc « Boutique (laisser tourner) » de la section 01.4 et laissez-le ouvert."; exit 1; }
echo "La boutique répond sur http://localhost:5173."
```

## 01.5 - Le serveur du lab, et le repli hors ligne

Par défaut, l'application interroge **DummyJSON** (https://dummyjson.com), une API publique de produits factices. Deux limites comptent pour la suite : elle exige du réseau, et elle ne retient rien (une écriture renvoie une réponse simulée, sans rien enregistrer ; l'étape 04 y revient). Le lab fournit donc un second serveur, dans `kit/server`, qui joue deux rôles sur le port **4310** :

- une **API de repli**, sous `/api`, qui imite les routes de DummyJSON utilisées par l'application à partir d'un instantané de 194 produits (les images, elles, viennent toujours de `cdn.dummyjson.com`) ;
- les **enchères en temps réel** (socket.io) de l'étape 05. Vous ne l'écrirez jamais : il est déterministe, ses bots jouent toujours la même partie.

Installez ses dépendances une fois pour toutes :

```exec
cd ~/byte-layers/vue/course/kit/server && npm install
```

Démarrez-le :

```exec
label: "Serveur du lab (laisser tourner)"
---
cd ~/byte-layers/vue/course/kit/server && npm start
```

Le terminal affiche `Serveur du lab sur http://localhost:4310` et la liste de ses adresses. Ces deux commandes sont aussi celles du repli : `api:local` désigne, dans ce lab, `cd ~/byte-layers/vue/course/kit/server && npm install && npm start`.

```verify
curl -fs http://localhost:4310/health | grep -q '"status":"ok"' || { echo "Le serveur du lab ne répond pas sur le port 4310 : lancez le bloc « Serveur du lab (laisser tourner) » de la section 01.5 et laissez-le ouvert."; exit 1; }
curl -fs "http://localhost:4310/api/products?limit=1" | grep -q '"products"' || { echo "L'API de repli ne répond pas : relisez la sortie du terminal du serveur."; exit 1; }
echo "Le serveur du lab répond, API de repli comprise."
```

**Si DummyJSON est injoignable** (pas de réseau, réseau filtré, panne), la page Produits affiche une alerte rouge à la place des cartes. Dites alors à l'application d'utiliser l'API de repli : l'URL de base vient de la variable `VITE_API_URL`, que Vite lit dans un fichier `.env.local` (jamais versionné). Le starter en fournit un modèle :

```exec
cd ~/byte-layers/vue/shop && cp .env.local.example .env.local
```

Vite lit ses variables au démarrage : arrêtez `npm run dev` (Ctrl+C) et relancez-le, puis rechargez la page. L'application interroge maintenant `http://localhost:4310/api` ; supprimez `.env.local` et relancez pour revenir à DummyJSON. Si DummyJSON répond chez vous, la copie est facultative, mais elle ne gêne pas : les tests du lab visent toujours DummyJSON, quel que soit ce fichier.

📖 [Les variables d'environnement avec Vite](https://vite.dev/guide/env-and-mode).

## 01.6 - Les conventions du projet : `AGENTS.md` et `data-testid`

Le starter porte ses règles dans un fichier, `AGENTS.md`, à la racine du projet. Le format est lu par la plupart des assistants de code : un assistant que vous solliciterez dans la journée applique les mêmes règles que vous, sans que vous les répétiez. Ouvrez `~/byte-layers/vue/shop/AGENTS.md` dans votre éditeur et lisez-le en entier ; voici ce qu'il fixe.

| Règle | Contenu |
|---|---|
| Commandes | `npm run dev`, `type-check`, `lint`, `test`, `build` |
| Code | TypeScript strict (ni `any` ni `@ts-ignore`), `<script setup lang="ts">`, props et émissions typées |
| Structure | un dossier par fonctionnalité sous `src/features/<nom>/`, avec ses composants, pages, routes, composables et tests |
| API | l'URL de base vient de `VITE_API_URL`, lue une seule fois dans `src/api/config.ts` |
| Tests | rôle et nom accessible d'abord, label ou texte ensuite, `data-testid` en dernier recours |

Les `data-testid` méritent un mot de plus, parce que vous en poserez à chaque composant que vous écrirez. Le but est de retrouver un élément dans un test sans dépendre de sa mise en forme. L'ordre de préférence est celui de la dernière ligne du tableau : d'abord le rôle et le nom (`getByRole('button', { name: 'Ajouter au panier' })`), puis le label, puis l'attribut. Quand l'attribut est nécessaire, la convention est `data-testid="<zone>-<élément>"`, en minuscules séparées par des tirets :

| Zone | Exemples déjà posés |
|---|---|
| `header` | `header-nav-products`, `header-cart`, `header-cart-count` |
| `product-card` | `product-card`, `product-card-title`, `product-card-add` |
| `cart` | `cart-item`, `cart-item-qty`, `cart-item-increase`, `cart-total`, `cart-clear` |

La zone est le composant ou la page qui porte l'élément. Un élément répété (`cart-item`, `product-card`) se retrouve avec `getAllByTestId`. Un `data-testid` ne contient jamais de donnée : pas d'identifiant de produit dedans. Les étapes suivantes ouvrent leurs propres zones (`login-*`, `auction-*`…) sur le même modèle, et le texte vous dira lesquelles poser.

## 01.7 - Visite : le catalogue chargé à la demande

Vous avez vu le catalogue tourner ; voyons comment il est branché. Le routeur (`src/router/index.ts`) ne déclare aucune page en dur : il assemble des tableaux de routes que chaque fonctionnalité exporte. Voici la route de la liste de produits, dans `src/features/products/routes.ts` :

```ts
{
  path: '',
  name: 'products',
  component: () => import('./pages/ProductListPage.vue'),
},
```

Le composant n'est pas importé en haut du fichier mais par une fonction qui renvoie un `import()` dynamique. Vite coupe le code à chaque `import()` : la page devient un **chunk**, un fichier JavaScript que le navigateur ne télécharge qu'à la première navigation vers cette route. Constatez-le sur le build de production, en ne gardant que les fichiers de pages :

```exec
cd ~/byte-layers/vue/shop && npm run build | grep -E 'dist/assets/[A-Za-z]+Page-.*\.js'
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `npm run build` | vérifie les types (`vue-tsc --build`) puis construit le site de production dans `dist/` |
> | `\|` | envoie la sortie de `npm run build` à la commande suivante |
> | `grep -E '…'` | ne garde que les lignes qui correspondent à l'expression : les chunks dont le nom finit par `Page-…js` |

La sortie liste un fichier par page : `HomePage`, `AboutPage`, `NotFoundPage`, `ProductListPage`, `ProductDetailPage` et `CartPage`, chacun avec sa taille. Retenez le principe plutôt que les tailles : l'accueil ne paie pas le coût de la page du panier. Le même dossier `features/products/` contient aussi le type `Product` (`types.ts`), la carte (`ProductCard.vue`) et les deux pages ; `src/api/products.ts` ne contient que l'accès réseau (`listProducts`, `getProduct`, `searchProducts`), avec un `fetch` volontairement nu.

Ce `fetch` nu a des défauts que vous verrez à l'œuvre : pas de cache, pas d'annulation, chaque visite de la page relance la requête. `ProductListPage.vue` gère à la main trois états (`loading`, `error`, la liste) avec trois `ref`. L'étape 02 y ajoute une recherche, et l'étape 04 remplace tout ce code par une bibliothèque d'état serveur.

📖 [Le chargement à la demande avec Vue Router](https://router.vuejs.org/guide/advanced/lazy-loading.html).

## 01.8 - Visite : le panier en Provide/Inject

Le panier est partagé par trois endroits qui ne sont pas parents les uns des autres : la carte de produit (pour ajouter), l'en-tête (pour la pastille) et la page du panier. Le starter le partage avec **Provide/Inject** : un composant ancêtre fournit une valeur, n'importe quel descendant l'injecte, sans passer par les props des composants intermédiaires. Trois fichiers de `src/features/cart/` font le travail.

La fabrique, dans `useCart.ts`, crée l'état et ses opérations. À chaque appel elle crée un état neuf :

```ts
export function useCart() {
  const state = reactive({ items: [] as CartItem[] })
  // addToCart, setQuantity, removeFromCart, clearCart…
  const totalItems = computed(() => state.items.reduce((sum, item) => sum + item.quantity, 0))
  return { state, addToCart, setQuantity, removeFromCart, clearCart, totalItems, totalPrice }
}
```

`CartProvider.vue` l'appelle **une seule fois** et la fournit. `App.vue` l'enveloppe autour de l'en-tête et du routeur : tout ce qui est dessous peut l'injecter.

```ts
provide(CART_KEY, useCart())
```

Les consommateurs passent par `useInjectedCart()`, qui écrit une seule fois l'`inject` et sa garde (une erreur claire si le fournisseur manque), au lieu de recopier ces lignes dans chaque composant :

```ts
export function useInjectedCart(): Cart {
  const cart = inject<Cart>(CART_KEY)
  if (!cart) throw new Error('Cart is not provided! Wrap the app in <CartProvider>.')
  return cart
}
```

Ce montage marche, mais il a des angles que l'étape 03 traite : la clé est une simple chaîne (`'cart'`), donc rien n'empêche de se tromper de type à l'injection ; le panier est perdu au rechargement de la page ; et il faut choisir, sciemment, entre ce montage, un composable partagé et un store Pinia. Lisez aussi le test fourni, `useCart.spec.ts` : il appelle `useCart()` sans composant ni application, ce qui est possible parce que la fabrique n'a besoin d'aucun contexte. Lancez-le avec le reste de la suite :

```exec
cd ~/byte-layers/vue/shop && npm test
```

Vitest annonce `Tests  2 passed (2)`.

📖 [Provide / Inject](https://vuejs.org/guide/components/provide-inject.html).

## 01.9 - Les Devtools de Vue

Installez l'extension **Vue Devtools** pour votre navigateur, en suivant [le guide d'installation](https://devtools.vuejs.org/guide/installation). Rechargez la boutique, ouvrez les outils du navigateur (F12) : un onglet **Vue** s'ajoute. Vous vous en servirez à plusieurs étapes, voici de quoi vous familiariser.

- **Components** : l'arbre des composants. Sélectionnez `ProductListPage` : le panneau de droite montre l'état de son `setup` (`products`, `loading`, `error`). Cliquez sur une carte de l'arbre pour voir ses props, dont `product`. Retrouvez `CartProvider` au-dessus de `AppHeader`.
- **Routes** : les routes enregistrées et la route courante.
- **Timeline** : une frise des événements (clics, navigation, composants montés) ; l'étape 07 s'en sert pour mesurer.

Les Devtools ne sont pas contrôlés par un `verify` : aucun test ne peut savoir ce que vous avez regardé. Si l'onglet Vue n'apparaît pas, rechargez la page avec les outils du navigateur déjà ouverts.

📖 [Vue Devtools](https://devtools.vuejs.org/).

## 01.10 - Vérifier que le starter se construit

Dernier contrôle, avant de plonger dans l'étape 02 : le projet, tel que vous l'avez copié, passe la vérification de types et se construit pour la production. Ce même contrôle vous servira de filet quand vous aurez modifié du code.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run build >/dev/null 2>&1) || { echo "La construction échoue : lancez npm run build dans $D et lisez la première erreur. Vous pouvez aussi repartir du starter avec les commandes de la section 01.3."; exit 1; }
[ -f "$D/dist/index.html" ] || { echo "Le dossier dist n'a pas été produit : relancez npm run build."; exit 1; }
echo "Le starter se construit : types et build de production passent."
```

## Récap

- Le kit est cloné dans `~/byte-layers/vue/course`, votre application est dans `~/byte-layers/vue/shop`, avec ses dépendances installées.
- La boutique tourne sur le port 5173 ; l'API est DummyJSON, ou le serveur du lab sur le port 4310 si le réseau manque (`.env.local`, puis relancer Vite).
- Les conventions sont dans `AGENTS.md` : un dossier par fonctionnalité, rôles et labels avant `data-testid`, et `data-testid="<zone>-<élément>"` sans donnée dedans.
- Les pages sont des chunks chargés à la demande ; le panier est un état unique créé par `useCart()`, fourni par `CartProvider` et injecté par `useInjectedCart()`.
- Les Devtools de Vue sont installés.

Dans l'étape suivante, [La réactivité de l'intérieur](02-reactivite.md), vous écrivez vous-même le moteur qui rend tout cela réactif (`ref`, `computed`, `watchEffect`), avant de brancher un `customRef` sur la recherche du catalogue.
