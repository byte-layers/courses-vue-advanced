# Serveur du lab (enchères + API de repli)

Serveur fourni : vous ne l'écrivez pas, mais vous pouvez l'ouvrir pour comprendre ce qu'il fait.
Il joue deux rôles sur **un seul port, 4310** :

- les **enchères en temps réel** (socket.io) pour la partie « boutique + enchères » ;
- une **API locale de repli** (`/api/*`) qui imite les routes de DummyJSON utilisées par l'application, pour travailler sans réseau.

Il s'exécute sans étape de build : **Node 22.18 ou plus**, qui lit directement les fichiers `.ts`
(`--experimental-strip-types`, déjà présent dans les scripts). Les types viennent de `../shared/events.ts`.

## Commandes

```bash
npm install
npm start          # enchères + API sur http://localhost:4310
npm run start:fast # idem, avec le « ticker rapide » (10 mises/s sur la 1re enchère)
npm run snapshot   # regénère data/products.json et data/users.json depuis dummyjson.com
npm test           # tests (node:test + socket.io-client), une vingtaine de secondes au plus
```

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `SOCKET_PORT` | `4310` | port du serveur |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | origines autorisées (liste séparée par des virgules, `*` pour toutes) |
| `AUCTION_DURATION_SECONDS` | `28800` (8 h) | durée des enchères, recalculée à chaque reset |
| `BID_STEP` | `5` | mise minimale au-dessus du prix courant (€) |
| `BOTS` | `on` | `off` désactive tous les bots (pour les tests) |
| `BOT_INTERVAL_MS` | `4000` | une surenchère de bot toutes les N ms, sur une enchère ouverte au hasard |
| `BOT_RATE` | `0` | `> 0` : ticker rapide, N mises par seconde (de +0,01 €) sur la première enchère (iPhone 13 Pro) |
| `BOT_SEED` | `42` | graine du générateur : même graine, mêmes bots |
| `TOKEN_TTL_SECONDS` | `60` | durée de vie de l'`accessToken` (voir plus bas) |
| `TIME_INTERVAL_MS` | `5000` | fréquence de `server:time` |

## Enchères (socket.io)

Cinq produits DummyJSON, une room par enchère : `auction:<productId>`.

| id | Produit | Départ |
|---|---|---|
| 123 | iPhone 13 Pro | 450 € |
| 78 | Apple MacBook Pro 14 | 900 € |
| 94 | Longines Master Collection | 600 € |
| 101 | Apple AirPods Max | 180 € |
| 174 | Sac Prada | 200 € |

Le serveur est la seule référence : prix, `version` (+1 à chaque enchère acceptée), `leader` et `endsAt` (horloge du serveur).

**Serveur vers client** : `auction:list` et `server:time` à la connexion ; `server:time` toutes les 5 s ;
`auction:state` (à chaque `auction:join` et à chaque reset) ; `auction:bid` et `auction:closed` à la room.

**Client vers serveur** : `auction:join(productId, ack)` (rejoint la room, répond l'état ou `null`),
`auction:leave(productId)`, `auction:bid({ productId, amount, bidder, expectedVersion? }, ack)`.

Réponses de `auction:bid`, toujours avec `price` et `version` courants :

- `{ ok: true, price, version }` : acceptée ;
- `too-low` : montant inférieur ou égal au prix, ou à moins d'un pas (`BID_STEP`) au-dessus ;
- `closed` : l'enchère est terminée ;
- `unknown-auction` : productId inconnu ;
- `outbid` : le client a envoyé `expectedVersion` et elle n'est plus à jour, c'est-à-dire qu'un autre enchérisseur a pris la main entre-temps.
  Sans `expectedVersion`, `outbid` n'est jamais renvoyé (seul `too-low` joue).

## Contrôle (démos et tests)

| Requête | Effet |
|---|---|
| `GET /health` | `{ status: "ok", serverNow, uptime }` |
| `GET /control/state` | heure, nombre de clients, enchères |
| `POST /control/bot-bid` `{ productId, amount? }` | un bot enchérit tout de suite (409 si refusée) |
| `POST /control/reset` `{ durationSeconds? }` | remet les 5 enchères à zéro, rejoue les bots depuis la graine |
| `POST /control/close` `{ productId }` | ferme une enchère tout de suite |
| `POST /control/stall` `{ ms? }` | gèle le serveur `ms` millisecondes (défaut 8000, plafond 30000) : il cesse de traiter les événements entrants des sockets et de diffuser ; les `auction:bid` reçus sont mis en file, traités dans l'ordre avec leur ack à la fin du délai. Les connexions restent ouvertes et les pings de socket.io reçoivent leur réponse (aucune coupure). Réponse `{ "stalledUntil": <heure serveur en ms> }` |
| `POST /control/drop-connection` `{ hard? }` | coupe tous les sockets comme une panne réseau : le client se reconnecte seul. Avec `{ "hard": true }`, déconnexion volontaire du serveur : le client ne se reconnecte pas tout seul (`socket.connect()`) |

```bash
curl -X POST localhost:4310/control/bot-bid -H 'Content-Type: application/json' -d '{"productId":123}'
curl -X POST localhost:4310/control/stall -H 'Content-Type: application/json' -d '{"ms":8000}'
curl -X POST localhost:4310/control/reset -H 'Content-Type: application/json' -d '{"durationSeconds":30}'
```

## API de repli (`/api/*`)

Même forme de réponse que https://dummyjson.com, à partir d'un instantané (`data/products.json`, 194 produits).
Les images pointent toujours vers `cdn.dummyjson.com` : il faut du réseau pour les voir.

- `GET /api/products` (`limit`, `skip`, `select`, `sortBy`, `order`), `/api/products/search?q=`, `/api/products/:id`,
  `/api/products/categories`, `/api/products/category/:slug`
- `POST /api/auth/login` `{ username, password }` : comptes de DummyJSON, par exemple `emilys` / `emilyspass`
  (autres : voir `data/users.json`). Répond `accessToken`, `refreshToken` et le profil.
- `POST /api/auth/refresh` `{ refreshToken }` : nouvelle paire de jetons.
- `GET /api/auth/me` avec `Authorization: Bearer <accessToken>` : le profil complet, ou 401
  (`Access Token is required`, `Token Expired!`, `Invalid/Expired Token!`).
- `POST /api/carts/add` : réponse simulée, rien n'est enregistré.

**Jetons qui expirent** : l'`accessToken` vit `TOKEN_TTL_SECONDS` secondes (60 par défaut), le `refreshToken` 30 jours.
Ce sont de vrais JWT : décodez-les pour lire `exp`. C'est ce qui permet au lab de faire écrire l'intercepteur de refresh.
Sans `TOKEN_TTL_SECONDS` explicite, `expiresInMins` envoyé dans le corps du login est respecté, comme chez DummyJSON.

## Comment le lab s'en sert

- Les étapes « temps réel » se branchent sur `ws://localhost:4310` (le contrat de types est dans `../shared/events.ts`).
- La démo de performance (étape 07) lance `npm run start:fast` : dix mises par seconde sur l'iPhone 13 Pro.
- Les tests de reconnexion appellent `POST /control/drop-connection`, les tests de refus `POST /control/bot-bid`,
  et chaque scénario repart de `POST /control/reset`.
- Sans réseau, l'application pointe sa base d'API sur `http://localhost:4310/api` au lieu de `https://dummyjson.com`.
