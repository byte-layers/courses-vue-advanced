---
title: "Vue avancé : une boutique qui parle en temps réel"
description: "Lab d'une journée pour développeurs expérimentés : écrire un mini moteur de réactivité, ranger l'état avec des composables et Pinia, séparer l'état serveur de l'état client avec TanStack Query, brancher des enchères en temps réel avec socket.io, bâtir des composants génériques, mesurer avant d'optimiser, puis tester le tout avec Vitest."
tags:
  - lab
  - vue
  - typescript
difficulty: advanced
duration: 375
introTitle: "Le lab"
requires: "0.4.0"
options:
  allowManualProgress: false
  autoCompleteOnNext: unverifiable
---

Une boutique en ligne a un catalogue, un panier, et une idée : vendre aussi certains produits aux enchères. Sur la page d'une enchère, le prix change sans que personne ne touche l'écran, parce qu'un autre visiteur vient de miser. C'est le fil de la journée : une application Vue 3 qui lit un catalogue, garde un panier, et reste juste quand le serveur lui parle.

Le point de départ est une boutique de formation connue (Vite, Vuetify, routeur, catalogue chargé à la demande, panier en Provide/Inject) branchée sur l'API publique [DummyJSON](https://dummyjson.com/docs). Chaque étape ajoute une couche : votre propre moteur de réactivité, des composables et un store, un état serveur en cache, un canal temps réel, des composants génériques, des mesures de rendu, puis des tests. Les enchères viennent d'un serveur **fourni** : vous n'en écrivez aucune ligne, vous écrivez le client.

| Étape | Ce que vous faites | Durée |
|---|---|---|
| 01 | Installer le starter et le parcourir | 20 min |
| 02 | Écrire `miniRef`, `miniComputed`, `miniWatchEffect`, puis un `customRef` de recherche | 40 min |
| 03 | Composables, store Pinia, persistance, plugin, directive, authentification | 55 min |
| 04 | Le catalogue en cache avec TanStack Query, mise à jour optimiste | 60 min |
| 05 | Enchères en temps réel avec socket.io | 60 min |
| 06 | Composants génériques, Teleport, transitions (option : checkout) | 50 min |
| 07 | Mesurer les rendus, puis optimiser | 30 min |
| 08 | Tests unitaires et d'intégration | 65 min |

L'option du checkout (étape 06) ajoute 30 minutes. La durée affichée ne la compte pas.

**Niveau** : développeur web expérimenté, à l'aise en TypeScript, qui a déjà vu les fondamentaux de Vue (le tutoriel officiel, `create-vue`, Vuetify, le routage, Pinia en survol). Le texte est du Vue pur et va droit au but ; chaque notion nouvelle est dite avant la commande qui s'en sert.

**Ce qu'il faut** :

- **Node.js 22.22 ou plus récent** et **Git** ;
- un navigateur basé sur Chromium ou Firefox, avec l'extension **Vue Devtools** ;
- un éditeur de code, par exemple VS Code avec l'extension Vue (Official) ;
- un accès à Internet pour l'API DummyJSON et les images ; sans réseau, un repli local sert l'API (étape 01).

Tout tourne sur votre poste et aucun compte en ligne n'est nécessaire. Les fichiers du lab vivent dans `~/byte-layers/vue` : le clone du dépôt dans `course`, votre application dans `shop`. Pour tout effacer à la fin de la journée, supprimez ce dossier ; aucune étape ne le supprime à votre place.

**Sous Windows**, tapez les commandes dans le terminal **Git Bash**, livré avec Git.

> 💡 **Si vous prenez du retard.** Chaque étape a un état de rattrapage : un script copie dans votre application le code tel qu'il doit être à la fin de l'étape, par exemple `sh ~/byte-layers/vue/course/kit/catch-up.sh 03`. Il écrase vos fichiers modifiés : committez avant. Il est rappelé en tête de chaque étape.

> 🧭 **Et ensuite.** Ce lab s'arrête aux tests unitaires et d'intégration. L'étape 08 prépare le terrain des tests de bout en bout avec Playwright : des `data-testid` stables, des handlers de mock réutilisables et cinq scénarios écrits, que vous jouerez dans une autre session.
