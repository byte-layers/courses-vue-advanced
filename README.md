# courses-vue-advanced

Un lab byte_layers d'une journée, hors path et hors stack : **Vue avancé : une boutique qui parle en temps réel**
(`vue-shop-day/`). Une boutique Vue 3 sur l'API DummyJSON reçoit des enchères en temps réel. L'apprenant écrit un
mini moteur de réactivité, range l'état avec des composables et Pinia, sépare l'état serveur de l'état client avec
TanStack Query, branche un client socket.io, bâtit des composants génériques, mesure puis optimise les rendus, et teste
le tout avec Vitest, Vue Test Utils et MSW.

| Dossier | Contenu |
|---|---|
| `vue-shop-day/.layers/` | le texte du lab, étapes 01 à 08 |
| `kit/app/` | la boutique de départ |
| `kit/server/` | le serveur d'enchères socket.io, avec une API locale qui imite DummyJSON (repli hors ligne) |
| `kit/shared/` | le contrat des événements socket, partagé par le serveur et l'application |
| `kit/steps/` | les fichiers fournis à chaque étape : tests Vitest et squelettes à compléter |
| `kit/solutions/` | l'application entière à la fin de chaque étape ; `kit/catch-up.sh` la copie |
| `kit/tools/` | `replay-lab.py` rejoue le texte comme un apprenant, `replay-solutions.sh` contrôle les solutions |

Le dépôt se clone dans `~/byte-layers/vue/course` ; l'application se construit dans `~/byte-layers/vue/shop`.

Licence : CC BY-NC-SA 4.0.
