# Scénarios E2E pour la session 2 (Playwright)

Cinq scénarios écrits, **pas encore automatisés** : Playwright n'est pas installé dans ce lab. Chaque scénario dit
quoi préparer, quoi faire, quoi vérifier, et avec quels sélecteurs (rôle et nom accessible d'abord, `data-testid` ensuite,
comme dans `AGENTS.md`). Ils n'ont pas été exécutés avec Playwright ; les comportements décrits ont été vérifiés à la main
dans le navigateur contre le vrai serveur du kit, et par les tests Vitest du dépôt.

## Mise en place commune

| Quoi | Commande |
|---|---|
| Serveur du kit (enchères + API de repli) | `cd ~/byte-layers/vue/course/kit/server && npm start` (port 4310) |
| Application branchée sur l'API locale (pas de réseau, données stables) | `.env.local` avec `VITE_API_URL=http://localhost:4310/api`, puis `npm run dev` |
| Avant **chaque** scénario d'enchère | `POST http://localhost:4310/control/reset` (rend les 5 enchères à leur état de départ) |
| Bots éteints (scénarios déterministes) | démarrer le serveur avec `BOTS=off npm start` |
| Origine autorisée par CORS | `http://localhost:5173` par défaut ; autre port : `CORS_ORIGIN=http://localhost:5290 npm start` |
| Compte de test | `emilys` / `emilyspass` (compte public de DummyJSON, déjà prérempli dans la page de connexion) |

Règles : un test part d'un navigateur vide (`localStorage` vide) ; on attend avec les assertions auto-patientes de
Playwright (`expect(locator).toHaveText(...)`), jamais avec `waitForTimeout` ; un scénario ne dépend pas d'un autre.

## Handlers MSW réutilisables (`src/test/handlers.ts`)

| Export | Rôle |
|---|---|
| `handlers`, `productAndCartHandlers` | catalogue, recherche, catégories, fiche produit, `POST /carts/add` (30 produits de test, `src/test/fixtures.ts`) |
| `authHandlers` | `POST /auth/login` (compte `demoUser`), `GET /auth/me`, `POST /auth/refresh` |
| `allHandlers` | les deux ensemble : ce qu'une page complète branche par défaut |
| `failures.cartAdd(status?, wait?)` | `POST /carts/add` refusé (500 par défaut), éventuellement lent |
| `failures.products(status?)` | la liste des produits répond une erreur |
| `failures.login()` | identifiants refusés (400) |
| `demoUser`, `demoTokens`, `paginate` | le compte, les jetons de test, l'aide de pagination |

Dans Vitest : `server.use(failures.cartAdd(500))` (voir `useAddToCart.spec.ts`). En E2E on préfère la vraie API locale du
serveur du kit ; ces handlers servent de référence du contrat DummyJSON et à écrire des `page.route(...)` quand un scénario
doit forcer une panne (à valider en session 2 : aucun lien Playwright n'a été essayé ici).

---

## Scénario 1 : panier, ajout, quantité, suppression

**But** : le panier réagit à chaque action, et le total reste juste.
**Préparation** : API locale ; aller sur `/products`.

1. Cliquer sur le premier bouton `getByRole('button', { name: 'Ajouter au panier' })` (`product-card-add`) deux fois.
   - Vérifier : `header-cart-count` affiche « 2 » ; une notification `notify` « … ajouté au panier » apparaît.
2. Ouvrir le panier : `getByRole('link', { name: 'Panier' })` (`header-cart`).
   - Vérifier : une seule ligne `cart-item`, `cart-item-qty` = « 2 », `cart-total` = 2 × le prix affiché sur la carte.
3. `getByRole('button', { name: 'Ajouter une unité' })` (`cart-item-increase`) : quantité « 3 », total mis à jour.
4. `getByRole('button', { name: 'Retirer une unité' })` (`cart-item-decrease`) deux fois : quantité « 1 ».
5. `getByRole('button', { name: 'Supprimer la ligne' })` (`cart-item-remove`).
   - Vérifier : `cart-empty` visible, `header-cart-count` absent, `cart-total` absent.

Pièges : `header-cart-count` n'existe pas quand le panier est vide (utiliser `toHaveCount(0)`) ; les prix sont lus sur la page,
pas écrits en dur.

## Scénario 2 : le panier survit au rechargement

**But** : la persistance (`localStorage`, clé `shop.cart`).

1. Ajouter deux produits différents depuis `/products` ; `header-cart-count` = « 2 ».
2. `page.reload()`.
3. Vérifier : `header-cart-count` = « 2 » ; sur `/cart`, deux `cart-item` aux mêmes titres.
4. Variante (stockage corrompu) : `page.addInitScript(() => localStorage.setItem('shop.cart', '{pas du json'))` avant `goto('/cart')`
   -> `cart-empty` visible, aucune erreur dans la console.

## Scénario 3 : une page protégée est bloquée sans connexion

**But** : la garde du routeur protège les pages réservées, et la connexion ramène à la page demandée.
**Deux variantes selon votre application** : si vous avez fait l'**option « commande » de l'étape 06**, le scénario vise `/checkout`
(variante A) ; sinon il vise `/account`, qui existe depuis l'étape 03 (variante B). Le principe est le même.

### Variante B (sans l'option) : `/account`

1. Sans session, `page.goto('/account')`.
   - Vérifier : l'URL est `/login?redirect=/account` ; `login-page` visible.
2. Se connecter : `getByLabel('Identifiant')` et `getByLabel('Mot de passe')` (préremplis avec le compte `emilys`), puis `login-submit`.
   - Vérifier : l'URL devient `/account` ; la page du compte affiche « Emily Johnson ».

### Variante A (avec l'option) : `/checkout`

1. Ajouter un produit, aller sur `/cart`, cliquer `getByRole('link', { name: 'Passer commande' })` (`cart-checkout`).
   - Vérifier : l'URL est `/login?redirect=/checkout` ; `login-page` visible.
2. Se connecter : `getByLabel('Identifiant')` et `getByLabel('Mot de passe')` (préremplis avec le compte `emilys`), puis `login-submit`.
   - Vérifier : l'URL devient `/checkout` ; `checkout-page` et `checkout-form` visibles ; `checkout-fullname` prérempli « Emily Johnson ».
3. Cliquer `checkout-submit` sans rien remplir.
   - Vérifier : les messages « Cette adresse e-mail n’est pas valide. », « Le code postal comporte 5 chiffres. »,
     « Vous devez accepter les conditions de vente. » ; `checkout-summary` « 5 champ(s) à corriger. » ; pas de `checkout-confirmation`.
4. Remplir correctement (`checkout-email`, `checkout-address`, `checkout-postalcode` = « 31000 », `checkout-city`, cocher `checkout-terms`), valider.
   - Vérifier : `checkout-confirmation` contient « CMD- » ; `header-cart-count` disparaît (panier vidé).
5. Variante : connecté, panier vide, `goto('/checkout')` -> `checkout-empty`.

Pièges : `data-testid` posé sur un `v-text-field` atterrit sur le conteneur : cibler `[data-testid="checkout-email"] input` ou `getByLabel('E-mail')` ;
la validation se déclenche à la sortie du champ (blur) et à l'envoi, pas à chaque frappe.

## Scénario 4 : enchère, surenchère par un bot

**But** : un événement serveur met l'écran à jour sans action de l'utilisateur, et l'annonce `aria-live` est émise.
**Préparation** : serveur `BOTS=off`, `POST /control/reset`, aller sur `/auctions`.

1. Attendre `auctions-connection` = « En direct » et 5 `auction-card`.
2. Sur la carte `[data-product-id="123"]`, cliquer `auction-card-open` : `auction-modal` visible (`getByRole('dialog')`, nom « iPhone 13 Pro »).
3. Le champ `getByLabel('Votre offre (€)')` vaut « 455 » (prix 450 + un pas de 5). Saisir « 500 », `auction-modal-submit`.
   - Vérifier : `auction-modal-price` = « 500,00 € », `auction-modal-leader` = « En tête : invité », une ligne dans `bid-history` (`bid-row`).
4. Un bot surenchérit : `request.post('http://localhost:4310/control/bot-bid', { data: { productId: 123, amount: 520 } })` ;
   la réponse JSON contient `bidder` (le nom du bot, à lire plutôt qu'à deviner).
   - Vérifier : `auction-modal-price` = « 520,00 € », `auction-modal-leader` contient `bidder`, `bid-history` a deux lignes,
     la première porte `bid-row-leading`, et `auction-modal-live` (`role="status"`, `aria-live="polite"`) contient « Vous êtes surenchéri : <bidder> a offert 520,00 € ».
5. Fermer avec la touche Échap : `auction-modal` disparaît ; le focus revient sur `auction-card-open`.

Pièges : la modale est téléportée dans `#modals` mais Playwright interroge le document entier, rien de particulier ;
l'annonce n'apparaît que si le dernier meneur connu était l'utilisateur (étape 3 d'abord).

## Scénario 5 : enchère, refus du serveur et retour en arrière visible

**But** : l'offre optimiste est annulée quand le serveur refuse.
**Préparation** : serveur démarré avec un **pas de 10** alors que le client croit qu'il est de 5 :
`BID_STEP=10 BOTS=off npm start`, puis `POST /control/reset`. L'offre minimale proposée par le client (455) est alors refusée (`too-low`) : refus déterministe, sans course entre deux clients.

1. Ouvrir la modale de l'iPhone (comme au scénario 4), laisser « 455 » dans le champ, `auction-modal-submit`.
2. Vérifier (assertions auto-patientes) : `auction-modal-error` (`role="alert"`) contient « Offre trop basse » ;
   `auction-modal-price` revient à « 450,00 € » ; `auction-modal-leader` = « Aucune offre pour le moment » ; `bid-history-empty` visible.
3. Saisir « 460 » (un vrai pas de 10), valider : l'erreur disparaît au changement de montant, le prix passe à « 460,00 € » et y reste.
4. Variante « enchère terminée » : `request.post('/control/close', { data: { productId: 123 } })` ; l'événement `auction:closed` arrive :
   `auction-modal-closed` visible, `auction-modal-submit` absent, et sur la carte `auction-card-closed` « Terminée ».

Pièges : en local, la réponse du serveur arrive en quelques millisecondes : le prix « optimiste » ne reste visible qu'un instant, ne pas
l'asserter (les tests Vitest du dépôt le font avec un faux socket) ; asserter l'état final. Couper la connexion pour tester la
reprise : `request.post('/control/drop-connection')` puis `auctions-offline` visible puis masqué, et le prix rattrapé (`{ hard: true }` : le client ne se reconnecte pas seul, utiliser `auctions-reconnect`).
