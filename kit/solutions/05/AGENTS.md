# Boutique Vue — règles du projet

Application du lab « Vue avancé » : Vue 3 + TypeScript + Vite + Vuetify, boutique branchée sur
DummyJSON (https://dummyjson.com). Ces règles valent pour toute personne ou tout assistant qui
modifie le code.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement (http://localhost:5173) |
| `npm run type-check` | `vue-tsc --build` : TypeScript strict sur les `.ts` et les `.vue` |
| `npm run lint` | ESLint (config flat) |
| `npm test` | Vitest, une seule passe |
| `npm run build` | type-check puis build de production |

Avant de dire qu'un travail est fini : `type-check`, `lint`, `test` et `build` passent, et leur
code de sortie a été lu.

## Règles de code

- TypeScript **strict** : pas de `any`, pas de `@ts-ignore`. Un type inconnu se valide (`zod`) ou se restreint.
- Composants : `<script setup lang="ts">`, `defineProps<...>()` et `defineEmits<...>()` typés.
- **Un dossier par fonctionnalité** : `src/features/<nom>/` contient ses composants, pages, routes,
  composables et tests. `src/components`, `src/lib`, `src/api` ne gardent que ce qui est partagé.
- Les routes d'une fonctionnalité sont dans `features/<nom>/routes.ts`, pages chargées à la demande (`() => import(...)`).
- L'URL de l'API vient de `VITE_API_URL` (`src/api/config.ts`), jamais écrite en dur dans un composant.
- Tout appel réseau passe par `src/api/http.ts` (jamais de `fetch` direct dans un composant), et chaque réponse est validée par un schéma zod (`features/products/schemas.ts`) ; les types se déduisent des schémas (`z.infer`).
- État SERVEUR (catalogue, fiches, catégories) : TanStack Query, clés fabriquées dans `queryKeys.ts`. État CLIENT (panier, session) : Pinia. Ne copiez pas un résultat de requête dans un store.
- Tests de composables : `withSetup()` (`src/test/with-setup.ts`) et le faux serveur MSW (`useMockServer()` en haut du fichier de test).
- État partagé : un store Pinia « setup » par fonctionnalité ; `provide`/`inject` uniquement avec une `InjectionKey` typée.
- Une route protégée porte `meta: { requiresAuth: true }` ; la garde est dans `router/guards.ts`.
- TEMPS RÉEL : les enchères arrivent par socket.io (`features/auctions/`). Le socket est typé avec les événements de `src/shared/events.ts` (copie EXACTE de `kit/shared/events.ts` : ne la modifiez pas ici). Le cache TanStack Query est alimenté par les événements (`setQueryData`), jamais copié dans un store. Un composable qui ouvre une connexion la ferme dans `onScopeDispose`.
- Un test qui touche au socket utilise le faux socket (`src/test/fake-socket.ts`), jamais un vrai réseau.
- Commentaires courts, en français, qui expliquent le pourquoi.

## Tests : rôles et labels d'abord, `data-testid` ensuite

Pour retrouver un élément dans un test, par ordre de préférence :

1. son **rôle** et son nom accessible (`getByRole('button', { name: 'Ajouter au panier' })`) ;
2. son **label** ou son texte ;
3. à défaut, un **`data-testid`**.

Convention : `data-testid="<zone>-<élément>"`, en minuscules séparées par des tirets.

| Zone | Exemples |
|---|---|
| `header` | `header-nav-home`, `header-nav-products`, `header-cart`, `header-cart-count` |
| `product-list` | `product-list`, `product-list-loading`, `product-list-error`, `product-list-empty` |
| `product` | `product-category` (liste déroulante), `product-refresh`, `product-pagination`, `product-list-retry`, `product-search` (champ de recherche : le `data-testid` est sur le conteneur `.v-input`, pas sur l'`<input>` : cherchez-le par son label « Rechercher un produit ») |
| `product-card` | `product-card`, `product-card-title`, `product-card-price`, `product-card-add` |
| `product-detail` | `product-detail`, `product-detail-title`, `product-detail-add` |
| `login` | `login-page`, `login-form`, `login-username`, `login-password`, `login-submit`, `login-error` |
| `account` | `account-page`, `account-name`, `account-error`, `account-reload`, `account-expire-token` |
| `header` (suite) | `header-login`, `header-user`, `header-logout` |
| `notify` | `notify` (la notification affichée) |
| `auctions` | `auctions-page`, `auctions-connection`, `auctions-loading`, `auctions-error`, `auctions-retry`, `auctions-offline`, `auctions-reconnect`, `auctions-list` |
| `auction-card` | `auction-card` (porte `data-product-id`), `auction-card-title`, `auction-card-price`, `auction-card-leader`, `auction-card-countdown`, `auction-card-closed`, `auction-card-open` |
| `auction-modal` | `auction-modal`, `auction-modal-price`, `auction-modal-leader`, `auction-modal-countdown`, `auction-modal-closed`, `auction-modal-live` (région `aria-live`), `auction-modal-bidder`, `auction-modal-amount`, `auction-modal-error`, `auction-modal-submit`, `auction-modal-history`, `auction-modal-bid`, `auction-modal-history-empty`, `auction-modal-close` |
| `header` (enchères) | `header-nav-auctions` |
| `home` | `home-page`, `home-cta`, `home-flash-countdown` |
| `cart` | `cart-page`, `cart-empty`, `cart-item`, `cart-item-qty`, `cart-item-increase`, `cart-item-decrease`, `cart-item-remove`, `cart-total`, `cart-clear` |

Règles : la zone est le composant ou la page qui porte l'élément ; un élément répété (`cart-item`)
est retrouvé par `getAllByTestId` ; un `data-testid` ne dépend jamais de données (pas d'id dedans) ;
les étapes suivantes ajoutent leurs zones (`login-*`, `auction-*`…) sur le même modèle.

## Structure

```
src/
  main.ts            création de l'application, plugins
  App.vue            coque : header, <RouterView />, notifications
  api/               accès réseau : config, `http.ts` (client unique : Bearer + renouvellement), produits (réponses validées par zod)
  shared/            `events.ts` : contrat socket.io partagé avec le serveur (copie exacte de kit/shared)
  directives/        directives globales (v-countdown)
  components/layout/ éléments partagés de la coque (AppHeader)
  features/products/ catalogue : routes, pages, composants, `schemas.ts` (zod), `queryKeys.ts`, composables TanStack Query (`useProducts`, `useProduct`)
  features/cart/     panier : store Pinia (`cartStore.ts`), persistance, page
  features/auctions/ enchères en direct : socket typé (`auctionSocket.ts`), `useAuctionSocket` (événements -> cache), `useBid` (offre optimiste), `auctionCache.ts` (fonctions pures de mise à jour), store Pinia de connexion/UI, page et modale
  features/auth/     session : store Pinia (`authStore.ts`), pages de connexion et de compte
  lib/               code sans lien avec l'interface (mini-reactivity, reactivity-pitfalls)
  composables/       composables partagés (useDebouncedRef)
  pages/             pages hors fonctionnalité (accueil, à propos, 404)
  plugins/           plugins Vue : Vuetify, notify (toasts, `provide` + `InjectionKey`)
  router/            routeur, gardes (`guards.ts`), types de `meta`
  test/              réglages Vitest (setup.ts), faux serveur MSW (`msw/`), `with-setup.ts`, `fixtures.ts`, `fake-socket.ts`, `auction-fixtures.ts`
```
