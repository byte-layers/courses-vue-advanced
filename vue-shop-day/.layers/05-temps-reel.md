---
title: "05 - Temps réel : les enchères"
description: "Suivre une enchère de bout en bout : afficher ses prix depuis le cache, recevoir les offres d'un socket, miser de façon optimiste avec retour en arrière, annoncer la surenchère aux lecteurs d'écran et se resynchroniser après une coupure."
---

**Durée** : environ 90 minutes (trois fichiers à écrire, dont la connexion `useAuctionSocket`, et quatre essais dans le navigateur).

La boutique sait lire des données qui viennent d'une requête. Les enchères, elles, **arrivent d'elles-mêmes** : un autre enchérisseur mise, le serveur pousse l'événement, et la page doit suivre sans que personne ne la recharge. Cette étape suit **une seule enchère, de bout en bout** : l'afficher, recevoir les offres des autres, miser, être surenchéri, puis retrouver le bon prix après une coupure du réseau. Le serveur d'enchères (socket.io) est fourni, vous ne l'écrivez pas ; vous écrivez les trois fichiers qui relient le socket au cache de l'étape 04 : les mises à jour du cache, la connexion, et l'offre optimiste.

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 04, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 04` : le script copie le code attendu dans `~/byte-layers/vue/shop` et écrase vos fichiers du même nom, pensez à les committer avant.

## 05.1 - Support : copier les fichiers fournis, installer le client socket et lancer le serveur

Cette section est un **support** : chaque geste est une commande. Vous aurez trois terminaux ouverts pendant l'étape, que le texte nomme : **Serveur** (le serveur d'enchères), **Application** (Vite) et **Commandes** (les `curl` et les commandes ponctuelles). Les commandes de cette section se tapent dans Commandes, sauf celles qui portent un label « laisser tourner ».

Copiez d'abord les fichiers de l'étape dans l'application. Cette fois la commande part de la racine de `shop`, parce que l'étape fournit aussi `env.d.ts` et `.env.example`, qui sont à la racine. Elle **écrase** donc quatre fichiers existants : `env.d.ts` et `.env.example` à la racine, `src/router/index.ts` (la route `/auctions` est ajoutée à celui de l'étape 03, garde comprise) et `src/components/layout/AppHeader.vue` (le lien « Enchères » s'y ajoute). Le dépôt `shop` est versionné depuis l'étape 01 : committez d'abord ce que vous avez modifié.

```exec
cp -R ~/byte-layers/vue/course/kit/steps/05/. ~/byte-layers/vue/shop/
```

Voici ce que vous venez de recevoir. Les trois squelettes sont les fichiers à écrire (leurs fonctions jettent `À écrire`) ; l'interface (la page, la carte, la fenêtre de mise) est fournie et déjà branchée sur ces trois fichiers.

| Fichier (sous `src/`) | Nature |
|---|---|
| `features/auctions/auctionCache.ts` | squelette : comment un événement modifie le cache |
| `features/auctions/useAuctionSocket.ts` | squelette : la connexion et ses écouteurs |
| `features/auctions/useBid.ts` | squelette : l'offre optimiste |
| `*.spec.ts` à côté de chaque squelette, `pages/AuctionsPage.spec.ts` | les tests qui valident votre travail |
| `shared/events.ts` | fourni : les types des événements socket, voir plus bas |
| `features/auctions/auctionSocket.ts`, `auctionStore.ts`, `queryKeys.ts`, `useAuctions.ts`, `useBidRules.ts` | fournis : le socket typé, le store Pinia, les clés du cache, les lectures, les règles d'une offre |
| `features/auctions/pages/`, `components/`, `routes.ts` | fournis : la page `/auctions`, la carte, la fenêtre de mise |
| `router/index.ts`, `components/layout/AppHeader.vue` | **remplacés** : la route `/auctions` et le lien « Enchères » de l'en-tête sont ajoutés |
| `env.d.ts`, `.env.example` (à la racine) | **remplacés** : la variable facultative `VITE_SOCKET_URL` est déclarée. `.env.example` est un modèle, comme `.env.local.example` de l'étape 01 : inutile d'y toucher tant que le serveur écoute sur `http://localhost:4310` |
| `test/fake-socket.ts`, `test/auction-fixtures.ts` | fournis : un faux socket pour les tests (étape 08) et des enchères d'exemple |

`shared/events.ts` mérite un mot. Le serveur et l'application importent les **mêmes types** d'événements : un nom d'événement ou une charge utile erronés deviennent une erreur de compilation, pas un bug en direct. Dans votre application, ce fichier est une **copie** de `kit/shared/events.ts`, plutôt qu'un alias Vite et TypeScript qui pointerait vers `../course/kit/shared`. La raison est pratique : l'application et le kit sont deux dossiers côte à côte, un alias relatif qui sort de la racine du projet casse dès qu'un dossier bouge. Ne modifiez pas la copie : le kit contrôle que toutes ses copies restent identiques à l'original.

Installez ensuite le client socket.io, qui est la seule nouvelle dépendance de l'étape. La version est fixée, comme celle du serveur du kit.

```exec
cd ~/byte-layers/vue/shop && npm install -E socket.io-client@4.8.4
```

Le serveur d'enchères a ses propres dépendances, dans `kit/server`. Elles ont été installées à la section 01.4 : la commande suivante ne fait alors que le constater, et elle est nécessaire si vous êtes arrivé ici par un rattrapage.

```exec
cd ~/byte-layers/vue/course/kit/server && npm install
```

Il reste à lancer le serveur d'enchères. C'est le **même serveur** qu'à la section 01.4 (« Serveur du lab »), qui sert ici ses enchères. S'il tourne encore, arrêtez-le d'abord avec `Ctrl+C` dans son terminal : un seul serveur doit écouter sur le port 4310. On le relance, dans le terminal **Serveur**, **sans bots**, c'est-à-dire sans les enchérisseurs automatiques qui, par défaut, misent seuls toutes les 4 secondes. Vos essais seront ainsi lisibles : le prix ne bouge que quand vous (ou un `curl` du terminal Commandes) le décidez.

```exec
label: "Serveur d'enchères (laisser tourner)"
---
cd ~/byte-layers/vue/course/kit/server && BOTS=off npm start
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `BOTS=off` | une variable d'environnement posée **pour cette seule commande** ; `off` désactive les bots du serveur |
> | `npm start` | lance le serveur du kit (socket.io et API de repli) sur le port 4310 |

```verify
D=~/byte-layers/vue/shop
for f in src/features/auctions/auctionCache.ts src/features/auctions/useAuctionSocket.ts src/features/auctions/useBid.ts src/shared/events.ts src/features/auctions/pages/AuctionsPage.spec.ts; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez la commande cp de la section 05.1."; exit 1; }
done
grep -q '"socket.io-client": "4.8.4"' "$D/package.json" || { echo "socket.io-client n'est pas fixé à 4.8.4 dans package.json : relancez la commande npm install de la section 05.1."; exit 1; }
[ -d "$D/node_modules/socket.io-client" ] || { echo "socket.io-client n'est pas installé dans node_modules : relancez la commande npm install."; exit 1; }
curl -fs http://localhost:4310/health | grep -q '"status":"ok"' || { echo "Le serveur d'enchères ne répond pas sur le port 4310 : lancez le bloc « Serveur d'enchères (laisser tourner) » de la section 05.1 et laissez son terminal ouvert."; exit 1; }
echo "Les fichiers fournis sont en place, le client socket est installé et le serveur répond."
```

## 05.2 - Le fil de l'étape : un événement devient une ligne du cache

Une requête HTTP demande puis reçoit. Un socket **reçoit sans avoir demandé** : le serveur envoie un événement chaque fois que quelque chose change. Le contrat de ces événements est dans `shared/events.ts`, et voici ce qui compte pour le fil de l'étape, avec l'iPhone 13 Pro (produit 123, départ à 450 €) comme exemple.

| Événement | Sens |
|---|---|
| `auction:list` (serveur vers client) | la liste des 5 enchères, envoyée à la connexion |
| `auction:join` (client vers serveur) | « je veux suivre l'enchère 123 » : une **room** est un canal d'abonnement côté serveur (une par enchère), et le serveur n'envoie les offres que des rooms rejointes ; il répond par l'état courant |
| `auction:leave` (client vers serveur) | « je ne suis plus cette enchère » : le client quitte la room |
| `auction:bid` (serveur vers client) | une offre acceptée : `{ productId, price, version, bidder, at }` |
| `auction:bid` (client vers serveur) | **ma** mise : `{ productId, amount, bidder, expectedVersion }` ; le serveur répond par un **accusé de réception** (`ack`) |
| `auction:closed`, `auction:state` | la fin de l'enchère ; l'état complet après un `join` ou une remise à zéro |
| `server:time` | l'heure du serveur, pour corriger le compte à rebours |

Un mot sur `version`, qui revient partout : le serveur l'**incrémente à chaque offre acceptée**. Elle sert à reconnaître une information périmée. Un événement dont la `version` n'est pas plus récente que celle qu'on connaît est ignoré ; une mise qui dit « j'ai vu la version 3 » alors que l'enchère en est à la 4 est détectée.

Où mettre ces données ? Ce sont de l'**état serveur** au sens de l'étape 04 : une copie de ce que le serveur détient, qui vieillit. Elles vont donc dans le **cache TanStack Query**, pas dans un store. Le fichier fourni `useAuctions.ts` les lit ainsi :

```ts
export function useAuctions() {
  const query = useQuery<AuctionState[]>({
    queryKey: auctionKeys.list(),
    queryFn: skipToken,
    staleTime: Infinity,
  })
  return { ...query, auctions: query.data }
}
```

`skipToken` dit « cette requête n'a **pas de fonction de lecture** » : personne n'ira chercher la liste. La requête reste en chargement (`isPending`) jusqu'à ce que quelqu'un écrive dans le cache avec `queryClient.setQueryData`, ce que fera votre composable à chaque événement. Le store Pinia fourni (`auctionStore.ts`) ne porte que ce que le cache ne sait pas porter : la connexion est-elle ouverte, quelle fenêtre est affichée, sous quel nom on mise.

Le fil se déroule dans cet ordre, une section par moment :

| Moment | Où |
|---|---|
| afficher et recevoir | `auctionCache.ts`, puis `useAuctionSocket.ts` (sections 05.3 à 05.5) |
| miser | `useBid.ts` (05.6) |
| être surenchéri | la région `aria-live` de la fenêtre de mise (05.7) |
| se reconnecter | la reprise dans `useAuctionSocket.ts` (05.8) |

> 📖 [TanStack Query : désactiver une requête avec `skipToken`](https://tanstack.com/query/v5/docs/framework/vue/guides/disabling-queries) · [socket.io : accusés de réception](https://socket.io/docs/v4/emitting-events/)

## 05.3 - Afficher : ce que chaque événement change dans le cache

Commençons par la partie sans socket ni Vue : décrire comment chaque événement transforme la liste des enchères. Chaque transformation est une **fonction pure** : elle reçoit l'ancienne valeur du cache et l'événement, et rend la nouvelle valeur. `setQueryData(clé, (ancien) => nouveau)` appelle cette fonction avec la valeur actuelle (ou `undefined` si le cache est encore vide) et range ce qu'elle rend.

Deux règles s'appliquent à toutes ces fonctions. Elles **ne mutent jamais** l'ancien tableau : on rend un nouveau tableau, avec un nouvel objet pour l'enchère qui change. Le motif : TanStack Query compare la nouvelle valeur à l'ancienne (partage structurel) pour savoir si quelque chose a changé ; un tableau muté en place serait comparé à lui-même, et aucun changement ne serait vu. Et quand rien ne change, elles rendent **la même référence** : cette valeur est reconnue comme identique, aucune notification n'est émise, et les quatre autres cartes, dont les objets n'ont pas bougé, gardent leur référence. (Ne confondez pas avec le retour `undefined` d'un `updater`, qui **annule** l'écriture : c'est ce que rend `applyBid` quand le cache est encore vide, car il rend alors `current`, qui est `undefined`.)

Ouvrez `src/features/auctions/auctionCache.ts`. Les quatre fonctions sont décrites par leurs commentaires `TODO` ; `HISTORY_LIMIT` est fourni.

**À vous** : écrivez `applyBid`, `applyState`, `applyClosed` et `pushBid`, puis supprimez la première ligne du fichier (le commentaire `eslint-disable`).

**Critères :**

- `applyBid(liste, offre)` met à jour `price`, `version` et `leader` (le `bidder` de l'offre) de l'enchère concernée et laisse les autres intactes ; une offre dont la `version` n'est pas supérieure à celle connue, une enchère inconnue ou un cache vide rendent la liste **telle quelle** ;
- `applyState(liste, état)` remplace l'enchère, l'ajoute à la fin si elle est inconnue, rend `[état]` si le cache est vide, et **ignore** un état encore ouvert dont la `version` est plus ancienne que celle connue (une réponse arrivée en retard) ;
- `applyClosed(liste, état)` remplace **toujours** l'enchère, même si la version affichée est plus récente : une fermeture est définitive ; une enchère inconnue est ajoutée à la fin, et un cache vide rend `[état]` ;
- `pushBid(historique, offre)` ajoute l'offre **en tête**, sans doublon de `version` (même tableau rendu dans ce cas), et garde au plus `HISTORY_LIMIT` offres ; un historique `undefined` (aucune offre encore reçue) rend `[offre]`.

```hint
Pour changer un seul élément d'un tableau sans le muter : `current.map((a) => (a === auction ? updated : a))`. Les éléments qui ne changent pas gardent leur référence, et `updated` s'écrit `{ ...auction, price: bid.price, … }`.
```

```hint
`pushBid` : `[bid, ...history].slice(0, HISTORY_LIMIT)`. Vérifiez le doublon d'abord, avec `history.some((b) => b.version === bid.version)`, et rendez `history` tel quel dans ce cas.
```

````solution
```ts
export function applyBid(
  current: AuctionState[] | undefined,
  bid: BidEvent,
): AuctionState[] | undefined {
  if (!current) return current
  const auction = current.find((a) => a.productId === bid.productId)
  if (!auction || bid.version <= auction.version) return current
  const updated: AuctionState = {
    ...auction,
    price: bid.price,
    version: bid.version,
    leader: bid.bidder,
  }
  return current.map((a) => (a === auction ? updated : a))
}

export function applyState(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  if (!current) return [state]
  const auction = current.find((a) => a.productId === state.productId)
  if (!auction) return [...current, state]
  if (state.status === 'open' && state.version < auction.version) return current
  return current.map((a) => (a === auction ? state : a))
}

export function applyClosed(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  if (!current) return [state]
  const index = current.findIndex((a) => a.productId === state.productId)
  if (index === -1) return [...current, state]
  return current.map((a, i) => (i === index ? state : a))
}

export function pushBid(history: BidEvent[] | undefined, bid: BidEvent): BidEvent[] {
  if (!history) return [bid]
  if (history.some((b) => b.version === bid.version)) return history
  return [bid, ...history].slice(0, HISTORY_LIMIT)
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/auctionCache.ts"
grep -q 'À écrire' "$F" && { echo "auctionCache.ts contient encore « À écrire » : écrivez applyBid, applyState, applyClosed et pushBid."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de auctionCache.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/auctionCache.spec.ts >/dev/null 2>&1) || { echo "Les tests du cache échouent : lancez « npx vitest run src/features/auctions/auctionCache.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il dit quelle fonction se trompe : une offre ancienne doit être ignorée, et rien ne doit être muté."; exit 1; }
echo "Chaque événement sait comment modifier le cache, sans le muter."
```

> 📖 [TanStack Query : `setQueryData`](https://tanstack.com/query/v5/docs/reference/QueryClient)

## 05.4 - Recevoir : une connexion qui vit autant que la page

Il faut maintenant brancher le socket sur ces fonctions. Trois idées guident le composable `useAuctionSocket`.

**La connexion a une durée de vie.** Un socket ouvert reste ouvert tant que personne ne le ferme, et ses écouteurs s'empilent à chaque visite de la page. Le composable doit donc **tout défaire** quand la page disparaît : retirer ses écouteurs, puis fermer le socket. Pour cela il utilise `onScopeDispose`, qui s'exécute à la fin du **scope d'effets** courant. Dans un composant, ce scope est celui de `setup`, donc le résultat est le même qu'avec `onUnmounted` ; la différence est que `onScopeDispose` marche aussi dans une `effectScope` créée à la main, ce qui rend le composable utilisable hors d'un composant (c'est ce que feront les tests de l'étape 08).

**Les rooms ne se souviennent de rien.** Le serveur n'envoie les offres que des enchères qu'on a rejointes (`auction:join`), et il **oublie tout** quand la connexion tombe. Le composable garde donc un `Set` des enchères rejointes, en fait le registre de ce qu'il doit refaire. La réponse (`ack`) à un `join` porte l'état courant de l'enchère : c'est ce qui va servir à la resynchronisation de la section 05.8.

**L'horloge du client n'est pas celle du serveur.** `endsAt` est exprimé sur l'horloge du **serveur**. Le compte à rebours de la carte (la directive `v-countdown` de l'étape 03) accepte un `offset`, qui est l'écart à corriger : le serveur envoie son heure à la connexion puis toutes les 5 secondes (`server:time`), et `clockOffset = heure du serveur - Date.now()`.

Dernier détail : le composable `provide` son socket aux composants enfants, pour que la fenêtre de mise et `useBid` retrouvent **le même socket** avec `inject`, sans l'importer ni en créer un second. Le socket vient d'abord de `options.socket` (les tests en passent un faux), sinon d'un socket déjà fourni plus haut, sinon d'un vrai (`createAuctionSocket`). Une remarque sur `getCurrentInstance()`, utilisée pour savoir si l'on est dans un composant avant d'appeler `provide` : c'est une API **interne**, que la documentation de Vue réserve aux auteurs de bibliothèques. Un composable applicatif l'emploie rarement ; ici elle évite l'avertissement de `provide` hors d'un composant.

Ouvrez `src/features/auctions/useAuctionSocket.ts`. Les types `UseAuctionSocketOptions` et `UseAuctionSocketReturn` sont fournis, et le commentaire qui précède la fonction détaille les six points ci-dessous.

**À vous** : écrivez `useAuctionSocket`, puis supprimez la première ligne du fichier.

**Critères :**

- le socket est `options.socket`, sinon `inject(auctionSocketKey, null)` (seulement si `hasInjectionContext()`), sinon `createAuctionSocket()` ; dans un composant (`getCurrentInstance()`), il est fourni avec `provide(auctionSocketKey, socket)` ;
- `clockOffset` (une `ref`, 0 au départ) vaut l'heure reçue dans `server:time` moins `Date.now()`, et `serverNow()` rend `Date.now() + clockOffset.value` ;
- `join(id)` ajoute l'enchère au `Set` et, si le socket est connecté, émet `auction:join` : la réponse passe par `applyState`. `leave(id)` la retire et émet `auction:leave` si connecté ;
- `auction:list` écrit la liste dans le cache (`auctionKeys.list()`) puis rejoint chaque enchère ; si une `version` **recule** par rapport au cache, le serveur a été remis à zéro et l'historique de cette enchère (`auctionKeys.bids(id)`) est vidé ; `auction:state`, `auction:bid` (liste **et** historique, avec `pushBid`) et `auction:closed` passent par les fonctions de `auctionCache.ts` ;
- `connect` marque le store connecté, efface l'erreur et **rejoint de nouveau** toutes les enchères du `Set` ; `disconnect` marque déconnecté ; `connect_error` marque déconnecté et pose le message « Serveur d'enchères injoignable. » ;
- `onScopeDispose` retire **tous** vos écouteurs (`socket.off`) puis appelle `socket.disconnect()` ; le socket est créé avec `autoConnect: false`, donc votre composable appelle `socket.connect()` à la fin ; il rend `{ socket, clockOffset, serverNow, join, leave, reconnect }`, où `reconnect()` rappelle simplement `socket.connect()` (c'est le bouton « Réessayer » de la page ; la section 05.8 montre à quoi il sert).

```hint
L'ordre du fichier suit les critères. Étape 1 : le socket (`options.socket ?? (hasInjectionContext() ? inject(auctionSocketKey, null) : null) ?? createAuctionSocket()`), `provide` si `getCurrentInstance()`, puis `const clockOffset = ref(0)` et `const serverNow = () => Date.now() + clockOffset.value`.
```

```hint
Étape 2 : `const joined = new Set<number>()` ; une fonction `emitJoin(id)` qui fait `socket.emit('auction:join', id, (state) => { if (state) … applyState … })` ; `join` ajoute au `Set` puis appelle `emitJoin` si `socket.connected` ; `leave` retire du `Set` et émet `auction:leave` si connecté.
```

```hint
Étape 3 : un objet `handlers` du type `Partial<ServerToClientEvents>`, avec une entrée par événement du serveur (`server:time`, `auction:list`, `auction:state`, `auction:bid`, `auction:closed`). Pour `auction:list`, lisez d'abord l'ancienne liste avec `queryClient.getQueryData` pour repérer une version qui recule.
```

```hint
Étape 4 : `onConnect` (store connecté, erreur effacée, puis `emitJoin` pour chaque id du `Set`), `onDisconnect`, `onConnectError` ; enregistrez-les avec `socket.on`. Étape 5 : `onScopeDispose` fait les `socket.off` correspondants puis `socket.disconnect()` ; terminez par `socket.connect()` et le retour.
```

```hint
Gardez vos écouteurs dans des constantes (ou dans un objet `{ événement: fonction }`) : `socket.off('auction:bid', handler)` n'a d'effet que si c'est **la même fonction** que celle donnée à `socket.on`. Une fonction anonyme passée à `on` ne peut plus être retirée.
```

```hint
`queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), (current) => applyBid(current, bid))` : l'écriture dans le cache tient en une ligne grâce à `auctionCache.ts`. Le client de cache s'obtient avec `useQueryClient()` et le store avec `useAuctionStore()`, tous deux dans le corps du composable.
```

````solution
Le fichier est long : lisez-le dans le kit, sur GitHub ([useAuctionSocket.ts](https://github.com/byte-layers/courses-vue-advanced/blob/main/kit/solutions/05/src/features/auctions/useAuctionSocket.ts)) ou sur votre poste, dans `~/byte-layers/vue/course/kit/solutions/05/src/features/auctions/useAuctionSocket.ts`. Son squelette, dans l'ordre : le socket et `provide` ; `clockOffset` et `serverNow` ; le `Set` `joined` avec `emitJoin`, `join` et `leave` ; un objet `handlers` qui associe chaque événement du serveur à son écriture dans le cache ; `onConnect` (qui rejoint de nouveau les enchères du `Set`), `onDisconnect` et `onConnectError` ; l'enregistrement des écouteurs avec `socket.on` ; `onScopeDispose` qui les retire avec `socket.off` puis ferme le socket ; enfin `socket.connect()` et le retour.
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/useAuctionSocket.ts"
grep -q 'À écrire' "$F" && { echo "useAuctionSocket.ts contient encore « À écrire » : écrivez le composable."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de useAuctionSocket.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/useAuctionSocket.spec.ts >/dev/null 2>&1) || { echo "Les tests de la connexion échouent : lancez « npx vitest run src/features/auctions/useAuctionSocket.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il nomme le point fautif : écouteurs non retirés au démontage, enchère non rejointe, décalage d'horloge ou reprise après coupure."; exit 1; }
echo "La connexion écrit dans le cache, corrige l'horloge, se reprend après une coupure et ne laisse rien ouvert."
```

> 📖 [Vue : `onScopeDispose` et `effectScope`](https://vuejs.org/api/reactivity-advanced.html) · [socket.io : l'instance du socket et ses événements](https://socket.io/docs/v4/client-socket-instance/) · [socket.io avec TypeScript](https://socket.io/docs/v4/typescript/)

## 05.5 - Recevoir dans le navigateur : les prix bougent seuls

La page `/auctions` est fournie et appelle déjà `useAuctionSocket`. Lancez le serveur de développement, dans le terminal **Application**. Si celui de l'étape 04 tourne encore, arrêtez-le d'abord avec `Ctrl+C` : un nouveau paquet vient d'être installé, et Vite doit repartir de zéro.

```exec
label: "Application (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

Les enchères durent 8 heures à partir du démarrage du serveur, et il tourne depuis un moment : remettez-les à zéro, depuis le terminal **Commandes**, pour que le décompte reparte de 8 heures et que les prix soient ceux de départ.

```exec
curl -X POST localhost:4310/control/reset
```

Ouvrez `http://localhost:5173/auctions` (rechargez si le premier chargement affiche `Failed to fetch dynamically imported module`). Vous devez voir un badge **« En direct »**, cinq cartes aux prix de départ (l'iPhone 13 Pro à 450 €, le MacBook à 900 €…), « Aucune offre » sous chaque prix et un compte à rebours qui descend, autour de `7:59:…` (huit heures moins quelques secondes). Dans les outils de développement, l'onglet Network, filtre « WS », montre la connexion socket et ses messages.

Maintenant, faites miser un autre enchérisseur. Dans le terminal **Commandes**, demandez au serveur de faire enchérir un bot sur l'iPhone, à 600 €.

```exec
curl -X POST localhost:4310/control/bot-bid -H 'Content-Type: application/json' -d '{"productId":123,"amount":600}'
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `curl -X POST` | envoie une requête HTTP de méthode `POST` |
> | `localhost:4310/control/bot-bid` | l'endpoint de contrôle du serveur du kit : un bot enchérit tout de suite |
> | `-H 'Content-Type: application/json'` | dit au serveur que le corps est du JSON |
> | `-d '{"productId":123,"amount":600}'` | le corps : l'enchère visée (l'iPhone) et le montant offert |

La réponse du serveur contient le nom du bot et l'accusé de sa mise. Regardez la carte de l'iPhone **sans recharger la page** : elle affiche 600,00 € et « En tête : » suivi du nom du bot, et les quatre autres cartes n'ont pas bougé. Si ce n'est pas le cas, regardez la console du navigateur et l'état du badge : « Hors ligne » veut dire que la connexion n'est pas ouverte.

```acknowledge
J'ai vu la carte de l'iPhone passer à 600 € sans recharger la page
```

## 05.6 - Miser : une offre optimiste, avec la version vue et un retour en arrière

Miser, c'est écrire, et l'on retrouve l'idée de l'étape 04 : une mise à jour **optimiste** change l'interface avant la réponse du serveur, en pariant qu'elle sera acceptée, et revient en arrière sinon. Ici trois précisions la rendent correcte.

**Dire quelle version on a vue.** La fenêtre de mise fournie envoie `expectedVersion: auction.version`, la version que **ce** client a vue en dernier. Si quelqu'un a misé entre-temps, la version du serveur a avancé : il répond `outbid` (« surenchéri ») et refuse. Sans `expectedVersion`, le serveur ne répond jamais `outbid` : seul `too-low` (montant insuffisant) peut refuser. C'est une **concurrence optimiste** : on ne verrouille rien, on détecte le conflit au moment d'écrire.

**Ne toucher ni à `version` ni à `status`.** L'état optimiste change `price` et `leader`, rien d'autre. Si le client incrémentait lui-même `version`, `applyBid` jetterait ensuite l'événement réel de l'autre enchérisseur, puisqu'il le jugerait plus ancien. Seul le serveur fait avancer la version.

**Annuler seulement si rien de plus récent n'est arrivé.** Quand le serveur traite votre mise, il a déjà diffusé l'offre de l'autre enchérisseur, et socket.io conserve l'ordre des paquets sur une même connexion : son événement `auction:bid` arrive donc **avant** votre refus `outbid`. Au moment où l'annulation s'exécute, le cache contient donc déjà l'état réel (la version a avancé). Restaurer le cliché pris avant votre mise écraserait l'offre de l'autre. La règle est la même que pour le panier de l'étape 04 : on annule **sa propre** modification, pas tout ce qu'on a vu. Concrètement : on restaure le cliché **seulement si la `version` dans le cache est encore celle du cliché**.

Un dernier point : la page officielle sur les mises à jour optimistes annule d'abord les lectures en cours (`cancelQueries`) avant d'écrire dans le cache. Ici aucune lecture n'existe (`skipToken`) : il n'y a rien à annuler, et `onMutate` s'en passe.

Reste le cas où le serveur ne répond pas du tout. Avec `socket.timeout(ms).emit(événement, charge, (erreur, ack) => …)`, le callback reçoit une erreur si l'`ack` n'arrive pas dans le délai. Sans ce délai, une réponse perdue laisserait la mutation en attente pour toujours.

Voici ce que l'écran doit faire selon la réponse du serveur :

| Réponse | Ce qui se passe à l'écran |
|---|---|
| `{ ok: true }` | le prix optimiste reste ; l'événement `auction:bid` du serveur fait avancer la version |
| `too-low`, `closed`, `outbid` sans autre événement | on revient au cliché, la fenêtre affiche la raison |
| `outbid` après l'offre d'un autre | on **garde** l'état réel de l'autre (la version a avancé) |
| aucune réponse en 5 s | on revient au cliché, avec « Le serveur n’a pas répondu à temps. » |

Ouvrez `src/features/auctions/useBid.ts`. Le délai, `BidRefusedError`, `refusalMessage` et le type `BidContext` sont fournis ; deux fonctions sont à écrire.

**À vous** : écrivez `sendBid` et `useBid`, puis supprimez la première ligne du fichier.

**Critères :**

- `sendBid` émet `auction:bid` avec `socket.timeout(BID_TIMEOUT_MS)` ; une erreur de délai rejette avec `new Error('Le serveur n’a pas répondu à temps.')` (le test accepte l'apostrophe droite ou l'apostrophe typographique `’`), `ack.ok === false` rejette avec `new BidRefusedError(ack.reason, ack.price, ack.version)`, sinon la promesse résout avec l'`ack` ;
- `useBid(socket)` prend son socket en paramètre, sinon par `inject(auctionSocketKey, null)` ; sans socket, il lève une erreur dont le message cite `useAuctionSocket` ;
- `onMutate` mémorise `{ previous }` (l'enchère telle qu'elle est dans la liste du cache) puis met `price` à `payload.amount` et `leader` à `payload.bidder`, **sans toucher** à `version` ni à `status` ;
- `onError` restaure `previous` **seulement si** la `version` de l'enchère dans le cache est celle de `previous` ; les autres enchères gardent la même référence.

```hint
`new Promise((resolve, reject) => socket.timeout(BID_TIMEOUT_MS).emit('auction:bid', payload, (error, ack) => { … }))` : testez `error` d'abord, puis `ack.ok`. TypeScript sait alors que `ack` est un `BidAck`.
```

```hint
Un petit utilitaire local évite de répéter la mise à jour : `patch(productId, (a) => …)`, qui appelle `queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), (list) => list?.map((a) => (a.productId === productId ? update(a) : a)))`. `onMutate` le déclenche avec `{ ...a, price, leader }`, `onError` avec `a.version === previous.version ? previous : a`.
```

````solution
```ts
function sendBid(socket: AuctionSocket, payload: BidPayload): Promise<BidAck> {
  return new Promise((resolve, reject) => {
    socket.timeout(BID_TIMEOUT_MS).emit('auction:bid', payload, (error, ack) => {
      if (error) return reject(new Error('Le serveur n’a pas répondu à temps.'))
      if (!ack.ok) return reject(new BidRefusedError(ack.reason, ack.price, ack.version))
      resolve(ack)
    })
  })
}

export function useBid(
  socket: AuctionSocket | null = inject(auctionSocketKey, null),
): UseMutationReturnType<BidAck, Error, BidPayload, BidContext> {
  if (!socket) throw new Error('Aucun socket : appelez useAuctionSocket() dans un composant parent.')
  const queryClient = useQueryClient()

  function patch(productId: number, update: (auction: AuctionState) => AuctionState) {
    queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), (list) =>
      list?.map((a) => (a.productId === productId ? update(a) : a)),
    )
  }

  return useMutation<BidAck, Error, BidPayload, BidContext>({
    mutationFn: (payload) => sendBid(socket, payload),

    onMutate: (payload) => {
      const list = queryClient.getQueryData<AuctionState[]>(auctionKeys.list())
      const previous = list?.find((a) => a.productId === payload.productId)
      // Ni `version` ni `status` ne bougent : seul le serveur les fait avancer.
      patch(payload.productId, (a) => ({ ...a, price: payload.amount, leader: payload.bidder }))
      return { previous }
    },

    onError: (_error, payload, context) => {
      const previous = context?.previous
      if (!previous) return
      // Si la version a avancé, un événement du serveur est arrivé : il est plus récent que notre cliché.
      patch(payload.productId, (a) => (a.version === previous.version ? previous : a))
    },
  })
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/auctions/useBid.ts"
grep -q 'À écrire' "$F" && { echo "useBid.ts contient encore « À écrire » : écrivez sendBid et useBid."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de useBid.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/auctions/useBid.spec.ts >/dev/null 2>&1) || { echo "Les tests de l'offre échouent : lancez « npx vitest run src/features/auctions/useBid.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Le test « outbid après l'offre d'un autre » refuse une annulation qui restaure toujours le cliché."; exit 1; }
echo "L'offre est optimiste, envoie la version vue, et ne revient en arrière que si rien de plus récent n'est arrivé."
```

> 📖 [TanStack Query : mises à jour optimistes](https://tanstack.com/query/v5/docs/framework/vue/guides/optimistic-updates) · [socket.io : accusés de réception et délai](https://socket.io/docs/v4/emitting-events/)

## 05.7 - Miser dans le navigateur, et être surenchéri sans le voir

Retournez dans le navigateur, sur `/auctions`. L'iPhone est à 600 € depuis la section 05.5 (le bot a misé avant l'ouverture de la fenêtre : l'historique des offres de cette fenêtre commencera donc vide, elle ne montre que les offres reçues depuis son ouverture). Cliquez sur « Enchérir » sur la carte de l'iPhone : une fenêtre s'ouvre, avec le prix, le compte à rebours, un champ « Votre nom », un champ d'offre prérempli à l'offre minimale (le prix courant plus 5 €, soit 605 €) et la liste des dernières offres, vide. Cliquez sur le bouton « Enchérir » de la fenêtre : le prix passe à 605 €, vous êtes « En tête : invité » et la liste compte une ligne.

Un essai instructif montre qu'un **délai dépassé n'est pas un refus**. Le serveur sait se geler : il cesse de traiter les messages et de diffuser, sans couper les connexions, puis traite à la fin tout ce qu'il a reçu, dans l'ordre. Le gel dure ici 15 secondes, bien plus que le délai de 5 secondes de `useBid`, qui court **depuis votre clic**. Procédez dans cet ordre :

1. Dans la fenêtre de l'iPhone, vérifiez que le champ d'offre affiche 610 (le minimum, après votre mise à 605 €) ; sinon saisissez-le.
2. Dans le terminal **Commandes**, lancez le gel, puis repassez dans le navigateur.

```exec
curl -X POST localhost:4310/control/stall -H 'Content-Type: application/json' -d '{"ms":15000}'
```

3. **Cliquez dans les 8 secondes** sur « Enchérir » dans la fenêtre : le prix monte **tout de suite** à 610 € (c'est la partie optimiste).
4. Cinq secondes après le clic, le prix redescend à 605 € et l'erreur « Le serveur n’a pas répondu à temps. » s'affiche : c'est l'annulation.
5. Le gel se termine ensuite (15 secondes après la commande) : le serveur traite la mise qu'il avait reçue et la diffuse. Le prix **remonte** à 610 € avec l'événement `auction:bid`.

Le client avait renoncé, mais le serveur avait fait son travail : l'événement du serveur a le dernier mot, et c'est pour cela que le cache se recale sur lui et non sur ce que le client croit. (Le serveur reste d'ailleurs joignable pendant le gel : aucune connexion n'est coupée.)

Reste l'annonce. Une personne qui utilise un lecteur d'écran n'a aucun moyen de **voir** que quelqu'un l'a surenchérie. La fenêtre fournie contient une **région `aria-live`** : un élément que le lecteur d'écran surveille et dont il lit à voix haute les changements de texte.

```vue
<div role="status" aria-live="polite" class="my-2" data-testid="auction-modal-live">
  {{ announcement }}
</div>
```

`role="status"` et `aria-live="polite"` disent « annonce ce texte quand il change, sans interrompre ce que tu lis ». Une région `polite` ne se déclenche que si elle **existe déjà dans la page** quand son texte change : elle est donc toujours rendue, vide au départ, et le texte arrive plus tard. Le message est calculé sur les **événements** `auction:bid`, pas sur le changement de `leader` : le meneur bouge aussi pendant l'état optimiste et pendant son annulation, et l'on ne veut annoncer que de vraies surenchères. La règle de la fenêtre : si le dernier meneur confirmé était moi et que la nouvelle offre vient d'un autre, on annonce « Vous êtes surenchéri : X a offert … ».

Essayez-le. Avec la fenêtre de l'iPhone ouverte et vous en tête (610 €), faites miser un bot depuis le terminal Commandes.

```exec
curl -X POST localhost:4310/control/bot-bid -H 'Content-Type: application/json' -d '{"productId":123,"amount":900}'
```

La fenêtre se met à jour toute seule : le prix passe à 900 €, le bot est en tête, une ligne s'ajoute à l'historique, et sous le prix apparaît **« Vous êtes surenchéri : » suivi du bot et de 900,00 €**. Dans l'onglet Elements des outils de développement, repérez la `div` `role="status"` : c'est elle que lirait un lecteur d'écran. (Sur macOS, `Cmd+F5` active VoiceOver pour l'entendre.) Fermez la fenêtre avec le bouton « Fermer ».

```acknowledge
J'ai vu la mise redescendre cinq secondes après le clic puis remonter à la fin du gel, et l'annonce « Vous êtes surenchéri » après la mise du bot
```

Les sept tests de la page rassemblent tout ce que vous avez écrit, avec un faux socket : chargement, prix mis à jour, compte à rebours corrigé, offre optimiste puis refusée, annonce.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npx vitest run src/features/auctions/pages/AuctionsPage.spec.ts >/dev/null 2>&1) || { echo "Les tests de la page échouent : lancez « npx vitest run src/features/auctions/pages/AuctionsPage.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Ils ont besoin des trois fichiers de l'étape, écrits : reprenez les sections 05.3, 05.4 et 05.6 si l'un contient encore « À écrire »."; exit 1; }
echo "La page d'enchères passe ses tests (avec un faux socket) : prix en direct, offre optimiste, refus et annonce."
```

> 📖 [MDN : régions ARIA live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

## 05.8 - Se reconnecter : retrouver le bon prix après une coupure

Dernier moment du fil : le réseau tombe. socket.io rouvre la connexion tout seul après une perte de transport, avec des délais croissants (plafonnés à 3 secondes par `createAuctionSocket`). Mais le serveur n'a rien gardé : la room n'est plus rejointe, et les offres arrivées pendant la coupure sont perdues. C'est pourquoi `onConnect`, dans votre composable, **rejoint de nouveau** chaque enchère du `Set` : la réponse à chaque `join` porte l'état courant, passé à `applyState`, qui remplace le prix périmé. Un seul mécanisme sert à la première connexion et à la reprise.

Faites l'essai en deux temps, avec la page `/auctions` ouverte et l'onglet Network des outils de développement filtré sur « WS ». D'abord une coupure **souple**, comme une panne de réseau : le serveur ferme tous les sockets. Depuis le terminal **Commandes** :

```exec
curl -X POST localhost:4310/control/drop-connection
```

Le badge peut passer à **« Hors ligne »** avec un bandeau jaune, mais la reconnexion part en moins de deux secondes : vous risquez de ne le voir qu'un instant, voire pas du tout. Fiez-vous à l'onglet WS : la connexion est **refermée puis rouverte** (une nouvelle ligne apparaît), et le badge est « En direct ». Votre `onConnect` a resynchronisé les enchères sans que vous fassiez rien.

Ensuite une coupure **dure**, où le serveur déconnecte volontairement le client. Dans ce cas socket.io ne retente **pas** de lui-même : le client doit rappeler `socket.connect()`, ce que fait le bouton « Réessayer » du bandeau (la fonction `reconnect` de votre composable).

```exec
curl -X POST localhost:4310/control/drop-connection -H 'Content-Type: application/json' -d '{"hard":true}'
```

Cette fois le badge passe à « Hors ligne » et **reste** hors ligne, avec le bandeau. Pendant ce temps, faites miser un bot sur l'iPhone, à 1 000 €.

```exec
curl -X POST localhost:4310/control/bot-bid -H 'Content-Type: application/json' -d '{"productId":123,"amount":1000}'
```

La carte de l'iPhone affiche toujours l'ancien prix : la page n'a rien reçu. Cliquez sur « Réessayer » dans le bandeau : le badge repasse à « En direct » et le prix passe à **1 000,00 €**, rattrapé par la réponse du `join`. Ce n'est pas un événement `auction:bid` que vous avez reçu, c'est l'état complet, et c'est ce qui rend la reprise fiable même quand plusieurs offres ont été manquées.

```acknowledge
J'ai vu la connexion se rouvrir seule après la coupure souple, puis le prix rattrapé après « Réessayer »
```

## 05.9 - Tout vérifier d'un coup

Avant de passer à la suite, il faut que les trois commandes de qualité du projet passent : `npm run type-check`, `npm run lint` et `npm test` (toute la suite, soit 132 tests dont les 40 de cette étape). Le bouton ci-dessous les lance pour vous, dans cet ordre, et s'arrête au premier échec.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Un fichier écrit garde souvent la première ligne eslint-disable, ou un import inutilisé."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent : l'application est dans l'état de fin d'étape 05."
```

## Récap

- Les enchères sont de l'**état serveur** qui arrive par événements : elles vivent dans le cache TanStack Query, alimentées par `setQueryData` et lues avec une requête `skipToken` ; Pinia ne porte que l'état de connexion et d'interface.
- Chaque événement est traduit en **fonction pure** (`applyBid`, `applyState`, `applyClosed`, `pushBid`) : elle ne mute rien, ignore ce qui est périmé grâce à `version` et rend la même référence quand rien ne change.
- `useAuctionSocket` ouvre la connexion avec la page et **la ferme avec elle** (`onScopeDispose`), garde la liste des rooms à rejoindre, corrige le compte à rebours de l'écart d'horloge et fournit son socket aux composants enfants.
- L'offre est **optimiste** : elle envoie `expectedVersion`, ne touche ni à `version` ni à `status`, et ne revient en arrière que si rien de plus récent n'est arrivé. Un délai dépassé n'est pas un refus : le serveur peut avoir accepté, et son événement a le dernier mot.
- Une région **`aria-live`** présente dès le départ annonce la surenchère, calculée sur les événements.
- Après une coupure, rejoindre de nouveau les rooms **resynchronise** l'état : la réponse de chaque `join` porte le prix courant.

L'étape suivante réécrit une partie de cette interface, que cette étape vous a fournie, avec les outils avancés de Vue : une grille générique, un champ en `v-model` avec `defineModel`, un historique animé, une frontière d'erreur et une modale téléportée. Vous en écrirez des versions réutilisables et accessibles.
