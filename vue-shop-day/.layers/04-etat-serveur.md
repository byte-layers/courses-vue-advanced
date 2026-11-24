---
title: "04 - État serveur : le catalogue avec TanStack Query"
description: "Remplacer les appels fetch du catalogue par un cache serveur : pagination, recherche, prefetch, invalidation, ajout au panier optimiste avec rollback, états de la requête et réponses validées par Zod."
---

Le catalogue charge ses produits avec `onMounted` et un `fetch` : pas de cache, pas de nouvelle tentative, et une course à gérer à la main quand l'utilisateur tape vite. Cette étape remplace ce code par **TanStack Query**, qui gère les données qui **appartiennent au serveur** : leur cache, leur fraîcheur, leurs états de chargement et d'erreur. Vous écrivez quatre fichiers (les schémas Zod, deux composables de lecture, une mutation optimiste), vous branchez le cache sur la page du catalogue, et vous regardez le résultat dans le navigateur. Un point à connaître d'avance : **DummyJSON ne persiste rien**, ce qui change la façon de penser l'ajout au panier (section 04.6).

**Durée** : environ 70 minutes (quatre exercices d'écriture, trois installations, un branchement et cinq essais dans le navigateur).

> 💡 **Si vous prenez du retard.** Pour repartir de l'état de fin de l'étape 03, lancez `sh ~/byte-layers/vue/course/kit/catch-up.sh 03` : le script copie le code attendu dans `~/byte-layers/vue/shop` et écrase vos fichiers du même nom, copiez d'abord votre dossier `src` ailleurs si vous voulez garder vos versions.

## 04.1 - Support : copier les fichiers fournis et installer les paquets

Cette section est un **support** : chaque geste est une commande. Copiez d'abord les fichiers fournis dans l'application. Trois d'entre eux (la liste, la carte et la fiche d'un produit) **remplacent** ceux de l'étape 03 : ils gardent la notification d'ajout et consomment les composables que vous allez écrire.

```exec
cp -R ~/byte-layers/vue/course/kit/steps/04/src/. ~/byte-layers/vue/shop/src/
```

Voici ce que vous venez de recevoir. Les quatre squelettes sont les fichiers à écrire (leurs fonctions jettent `À écrire`) ; le reste est fourni.

| Fichier | Nature |
|---|---|
| `features/products/schemas.ts` | squelette : les schémas Zod des réponses |
| `features/products/useProducts.ts` | squelette : le catalogue paginé et les catégories |
| `features/products/useProduct.ts` | squelette : la fiche d'un produit et son prefetch |
| `features/cart/useAddToCart.ts` | squelette : l'ajout au panier optimiste |
| `*.spec.ts` à côté de chaque squelette | les tests qui valident votre travail |
| `api/products.ts` | fourni : les appels réseau, qui passent par `http` et valident chaque réponse |
| `features/products/queryKeys.ts` | fourni : la fabrique des clés de cache |
| `ProductListPage.vue`, `ProductCard.vue`, `ProductDetailPage.vue` | fournis : les pages et la carte qui consomment vos composables |
| `test/fixtures.ts`, `test/msw/*`, `test/with-setup.ts` | fournis : un faux DummyJSON (MSW) et `withSetup`, qui exécute un composable dans un vrai composant ; vous les relirez à l'étape 08 |

Installez ensuite les trois paquets de l'étape. Les deux premiers sont des dépendances de l'application : TanStack Query pour le cache, et Zod pour valider les réponses.

```exec
cd ~/byte-layers/vue/shop && npm install -E @tanstack/vue-query@5.108.4 zod@4.6.7
```

MSW ne sert qu'aux tests : il simule l'API sans réseau. On l'installe donc en dépendance de développement.

```exec
cd ~/byte-layers/vue/shop && npm install -E -D msw@3.0.7
```

> 🔍 **Comprendre la commande**
>
> | Morceau | Rôle |
> |---|---|
> | `-E` | écrit la version exacte dans `package.json`, sans `^` |
> | `-D` | classe MSW dans `devDependencies` : utile pour travailler, absent du code livré |

Tant que vous n'avez pas écrit les composables, l'application affichera des erreurs `À écrire` dans le navigateur : ne l'ouvrez qu'à la section 04.8.

```verify
D=~/byte-layers/vue/shop
for f in src/features/products/schemas.ts src/features/products/useProducts.ts src/features/products/useProduct.ts src/features/cart/useAddToCart.ts src/features/products/queryKeys.ts src/test/msw/server.ts; do
  [ -f "$D/$f" ] || { echo "Le fichier $f manque : relancez la commande cp de la section 04.1."; exit 1; }
done
grep -q '"@tanstack/vue-query": "5.108.4"' "$D/package.json" || { echo "TanStack Query n'est pas fixé à 5.108.4 dans package.json : relancez la première commande npm install."; exit 1; }
grep -q '"zod": "4.6.7"' "$D/package.json" || { echo "Zod n'est pas fixé à 4.6.7 dans package.json : relancez la première commande npm install."; exit 1; }
grep -q '"msw": "3.0.7"' "$D/package.json" || { echo "MSW n'est pas fixé à 3.0.7 dans package.json : relancez la seconde commande npm install."; exit 1; }
[ -d "$D/node_modules/@tanstack/vue-query" ] && [ -d "$D/node_modules/zod" ] && [ -d "$D/node_modules/msw" ] || { echo "Un paquet n'est pas installé dans node_modules : relancez les commandes npm install."; exit 1; }
echo "Les fichiers fournis sont en place, et les trois paquets sont installés."
```

## 04.2 - État serveur et état client

Deux sortes d'état cohabitent dans l'application, et les confondre est la source de beaucoup de code inutile.

- L'**état client** appartient à l'interface : le contenu du panier, la session, l'onglet ouvert. Il est synchrone, on le possède, et un store Pinia est son outil (étape 03).
- L'**état serveur** appartient à l'API : la liste des produits, une fiche. On n'en détient qu'une **copie**, qui arrive de façon asynchrone, qui peut être périmée à tout moment et que d'autres onglets ou d'autres utilisateurs modifient. Il faut la garder en cache, savoir quand elle est fraîche, la recharger, annuler un appel devenu inutile.

TanStack Query est le cache de l'état serveur. Il remplace les `ref` de données, de chargement et d'erreur, les `onMounted` et les `AbortController` écrits à la main (à l'étape 02, `ProductListPage` en portait un). Voici le vocabulaire de l'étape :

| Terme | Sens |
|---|---|
| `queryKey` | l'identité d'une donnée dans le cache : un tableau qui contient **tout ce dont dépend la réponse** (page, recherche, catégorie) |
| `queryFn` | la fonction qui va chercher la donnée ; elle reçoit un `signal` pour annuler l'appel |
| `staleTime` | la durée pendant laquelle une donnée est **fraîche** et servie sans nouvel appel (0 par défaut) |
| `isPending` | aucune donnée n'est encore disponible : la toute première charge |
| `isFetching` | un appel est en cours, même si une donnée est déjà affichée |
| invalidation | marquer des données comme périmées ; celles qui sont affichées sont rechargées |
| mutation | une écriture sur le serveur (`useMutation`), dont le résultat n'est pas servi comme une lecture : on la déclenche, on ne la relit pas |

La règle qui découle de tout cela : un composable de lecture déclare **ce dont il dépend** dans sa clé, et TanStack Query refait l'appel quand cette clé change. Vous n'écrivez plus de `watch(…, load)`.

> 📖 [TanStack Query pour Vue : aperçu](https://tanstack.com/query/v5/docs/framework/vue/overview) · [clés de requête](https://tanstack.com/query/v5/docs/framework/vue/guides/query-keys)

## 04.3 - Valider les réponses avec Zod

Une réponse d'API est **inconnue à la compilation** : TypeScript fait confiance au type qu'on lui annonce, pas aux octets reçus. Si l'API renvoie un prix en chaîne ou oublie un champ, l'erreur apparaît loin de sa cause, sous la forme d'un `undefined` dans un composant. Un **schéma Zod** vérifie la réponse à l'exécution, à la frontière, et le type TypeScript s'en déduit avec `z.infer` : une seule définition pour les deux.

Le fichier fourni `api/products.ts` appelle déjà `productListSchema.parse(…)` sur chaque réponse : une réponse inattendue devient une erreur claire dans l'état `isError` de la requête. Par défaut, `z.object` **retire** les champs qu'il ne connaît pas : le code n'en voit pas passer.

Ouvrez `src/features/products/schemas.ts`. Chaque schéma est pour l'instant un `z.custom(todo)` qui jette `À écrire`, et des types écrits à la main à côté.

**À vous** : remplacez chaque `z.custom(todo)` par un vrai schéma, déduisez les types avec `z.infer`, puis supprimez le helper `todo`, l'import de `./types`, les deux interfaces écrites à la main et la première ligne du fichier (le commentaire `eslint-disable`). Faites ensuite que `src/features/products/types.ts` ré-exporte `Product`, `ProductList` et `Category` depuis `./schemas`, à la place de ses interfaces.

**Critères :**

- `productSchema` décrit un produit DummyJSON : `id` (entier), `title`, `description`, `category`, `thumbnail` (chaînes), `price` (nombre positif ou nul), `discountPercentage`, `rating` (nombres), `stock` (entier positif ou nul), `images` (tableau de chaînes) ; `brand` est **facultatif** (il manque sur 92 des 194 produits) ;
- `productListSchema` décrit `{ products, total, skip, limit }`, `categoriesSchema` un tableau de `{ slug, name, url }`, `cartAddResponseSchema` `{ id, userId, totalProducts, totalQuantity }` (entiers) ;
- les types `Product`, `ProductList`, `Category` et `CartAddResponse` sont déduits des schémas, et `types.ts` les ré-exporte.

```hint
Un objet s'écrit `z.object({ id: z.number().int(), title: z.string(), … })`. Un champ facultatif se termine par `.optional()`, un tableau s'écrit `z.array(z.string())`, et `z.number().nonnegative()` refuse les valeurs négatives.
```

```hint
`export type Product = z.infer<typeof productSchema>`. Dans `types.ts`, une seule ligne suffit : `export type { Product, ProductList, Category } from './schemas'`.
```

````solution
```ts
// src/features/products/schemas.ts
import { z } from 'zod'

export const productSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number().int().nonnegative(),
  brand: z.string().optional(), // absent sur certains produits DummyJSON
  thumbnail: z.string(),
  images: z.array(z.string()),
})

export const productListSchema = z.object({
  products: z.array(productSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
})

export const categorySchema = z.object({ slug: z.string(), name: z.string(), url: z.string() })
export const categoriesSchema = z.array(categorySchema)

export const cartAddResponseSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  totalProducts: z.number().int(),
  totalQuantity: z.number().int(),
})

export type Product = z.infer<typeof productSchema>
export type ProductList = z.infer<typeof productListSchema>
export type Category = z.infer<typeof categorySchema>
export type CartAddResponse = z.infer<typeof cartAddResponseSchema>
```

```ts
// src/features/products/types.ts
export type { Product, ProductList, Category } from './schemas'
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/products/schemas.ts"
grep -q 'À écrire' "$F" && { echo "schemas.ts contient encore « À écrire » : remplacez chaque z.custom(todo) par un schéma z.object, et supprimez le helper todo."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de schemas.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
grep -q 'z.infer' "$F" || { echo "schemas.ts ne déduit pas ses types avec z.infer : écrivez export type Product = z.infer<typeof productSchema> et ses équivalents."; exit 1; }
grep -q "from './schemas'" "$D/src/features/products/types.ts" || { echo "types.ts doit ré-exporter les types depuis ./schemas : export type { Product, ProductList, Category } from './schemas'."; exit 1; }
(cd "$D" && npx vitest run src/features/products/schemas.spec.ts >/dev/null 2>&1) || { echo "Les tests des schémas échouent : lancez « npx vitest run src/features/products/schemas.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Rappel : brand est facultatif, et un prix en chaîne doit être refusé."; exit 1; }
echo "Les schémas valident les réponses, et les types s'en déduisent."
```

> 📖 [Zod : introduction](https://zod.dev/) · [Zod : référence des schémas](https://zod.dev/api)

## 04.4 - Le catalogue paginé et ses catégories

Le catalogue dépend de quatre choses : la page, la taille de page, le texte de recherche et la catégorie. Chacune doit être dans la **clé**. Pour ne pas écrire ces tableaux à la main à dix endroits, le projet a une **fabrique de clés**, fournie, du plus large au plus fin :

```ts
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: { page: number; pageSize: number; search: string; category: string | null }) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
}
```

Cette hiérarchie sert à l'invalidation : invalider `productKeys.all` touche tout le catalogue, `productKeys.lists()` seulement les listes. La page, elle, passe des **refs** à `useProducts` : la clé est un `computed` qui les lit avec `toValue`, et TanStack Query refait l'appel dès qu'elle change. L'API de DummyJSON pagine par `limit` et `skip` : `skip = (page - 1) * pageSize`.

**Une règle de cache à connaître :** le `queryFn` doit lire ses paramètres dans la clé qu'il reçoit. S'il lisait la valeur courante des refs, une nouvelle tentative après un échec (`retry`) refaisait la requête de la page **affichée maintenant**, et rangeait sa réponse sous la clé de l'ancienne page : le cache serait empoisonné.

Deux options du cache comptent ici. `placeholderData: keepPreviousData` garde la page précédente à l'écran pendant que la suivante charge, au lieu d'une page blanche. `staleTime: 30_000` considère une page comme fraîche pendant 30 secondes : y revenir ne refait aucun appel.

Ouvrez `src/features/products/useProducts.ts`. Les types `ProductsParams` et `UseProductsResult` sont fournis, et les deux fonctions à écrire sont décrites par leurs commentaires `TODO`.

**À vous** : écrivez `useProducts` et `useCategories`, puis supprimez la première ligne du fichier.

**Critères :**

- `useProducts(params)` appelle `fetchProducts({ limit, skip, q, category }, signal)` (de `@/api/products`) à travers `useQuery`, avec une `queryKey` calculée par `productKeys.list(…)` à partir des paramètres réactifs ; `pageSize` vaut 12 par défaut ;
- le `queryFn` lit ses paramètres dans la **`queryKey` qu'il reçoit** (`({ queryKey, signal }) => … queryKey[2]`), pas dans la valeur courante des refs ;
- `placeholderData: keepPreviousData` et `staleTime: 30_000` sont réglés : la section 04.8 s'appuie sur le second ;
- il renvoie `products`, `total`, `pageCount` (`Math.ceil(total / pageSize)`), `isPending`, `isFetching`, `isError`, `error`, `refetch`, et `isEmpty`, vrai **seulement** quand la requête a réussi et que la liste est vide ;
- changer de page appelle `skip = 12`, et l'ancienne page reste affichée pendant le chargement ;
- `useCategories()` lit `fetchCategories` sous `productKeys.categories()`, avec `staleTime: Infinity`, et renvoie `{ categories }`, un tableau vide tant que la réponse n'est pas là.

```hint
Importez `computed` et `toValue` de `vue`, `keepPreviousData` et `useQuery` de `@tanstack/vue-query`. `const key = computed(() => productKeys.list({ page: toValue(params.page), … }))` donne une clé réactive : passez-la à `useQuery({ queryKey: key, … })`. Les données se lisent avec `query.data.value`. `MaybeRefOrGetter` et `toValue` sont ceux de l'étape 02 : `toValue` lit indifféremment un nombre, un ref ou un getter.
```

```hint
`isEmpty` ne se calcule pas avec « la liste est vide » seul : pendant le chargement, elle l'est aussi. Il faut `query.isSuccess.value && products.value.length === 0`.
```

````solution
```ts
export function useProducts(params: ProductsParams): UseProductsResult {
  const pageSize = params.pageSize ?? 12

  // La clé contient tout ce dont dépend le résultat : TanStack Query refait l'appel quand elle change.
  const key = computed(() =>
    productKeys.list({
      page: toValue(params.page),
      pageSize,
      search: toValue(params.search) ?? '',
      category: toValue(params.category) ?? null,
    }),
  )

  const query = useQuery({
    queryKey: key,
    // Les paramètres viennent de la clé REÇUE, pas de la valeur courante : après un échec, la nouvelle
    // tentative refait la requête de SA clé, même si l'utilisateur est déjà passé à une autre page.
    queryFn: ({ queryKey, signal }) => {
      const { page, search, category } = queryKey[2]
      return fetchProducts(
        { limit: pageSize, skip: (page - 1) * pageSize, q: search, category },
        signal,
      )
    },
    placeholderData: keepPreviousData, // pendant le chargement de la page suivante, on garde l'ancienne
    staleTime: 30_000,
  })

  const products = computed(() => query.data.value?.products ?? [])
  const total = computed(() => query.data.value?.total ?? 0)
  return {
    products,
    total,
    pageCount: computed(() => Math.ceil(total.value / pageSize)),
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    isEmpty: computed(() => query.isSuccess.value && products.value.length === 0),
    refetch: query.refetch,
  }
}

/** Les catégories changent rarement : mises en cache sans péremption. */
export function useCategories() {
  const query = useQuery<Category[]>({
    queryKey: productKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: Infinity,
  })
  return { categories: computed(() => query.data.value ?? []), ...query }
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/products/useProducts.ts"
grep -q 'À écrire' "$F" && { echo "useProducts.ts contient encore « À écrire » : écrivez useProducts et useCategories."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de useProducts.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/products/useProducts.spec.ts >/dev/null 2>&1) || { echo "Les tests du catalogue échouent : lancez « npx vitest run src/features/products/useProducts.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Il nomme le paramètre fautif : page, recherche, catégorie ou état vide."; exit 1; }
echo "Le catalogue est paginé, mis en cache, et ses états sont distincts."
```

> 📖 [TanStack Query : requêtes paginées](https://tanstack.com/query/v5/docs/framework/vue/guides/paginated-queries)

## 04.5 - La fiche d'un produit et son prefetch au survol

La fiche d'un produit est une requête **partagée** : la page de détail la lit, et la carte du catalogue peut la **précharger** au survol, pour qu'elle soit déjà dans le cache au clic. Les deux doivent employer exactement la même clé et la même fonction. `queryOptions` sert à cela : il décrit une requête une seule fois, avec ses types, et `useQuery`, `prefetchQuery` ou, plus tard, `setQueryData(options.queryKey, …)` le réutilisent sans rien dupliquer.

Ouvrez `src/features/products/useProduct.ts`. Trois fonctions sont à écrire.

**À vous** : écrivez `productDetailOptions`, `useProduct` et `usePrefetchProduct`, puis supprimez la première ligne du fichier.

**Critères :**

- `productDetailOptions(id)` renvoie un `queryOptions` avec la clé `productKeys.detail(id)`, la fonction `fetchProduct(id, signal)` et un `staleTime` de 60 secondes ;
- `useProduct(id)` accepte un nombre, un ref ou un getter, et suit ses changements (navigation d'une fiche à l'autre) ;
- `usePrefetchProduct()` renvoie une fonction `prefetch(id)` qui appelle `queryClient.prefetchQuery(…)` avec les mêmes options : la fiche est déjà en cache quand `useProduct` la demande, et rien n'est refait tant qu'elle est fraîche.

```hint
`useQuery` accepte un `computed` d'options : `useQuery(computed(() => productDetailOptions(toValue(id))))`. Le client de cache s'obtient avec `useQueryClient()`, dans `setup`.
```

````solution
```ts
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/vue-query'
import { fetchProduct } from '@/api/products'
import { productKeys } from './queryKeys'

export function productDetailOptions(id: number) {
  return queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    staleTime: 60_000,
  })
}

export function useProduct(id: MaybeRefOrGetter<number>) {
  return useQuery(computed(() => productDetailOptions(toValue(id))))
}

export function usePrefetchProduct() {
  const queryClient = useQueryClient()
  return (id: number) => queryClient.prefetchQuery(productDetailOptions(id))
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/products/useProduct.ts"
grep -q 'À écrire' "$F" && { echo "useProduct.ts contient encore « À écrire » : écrivez productDetailOptions, useProduct et usePrefetchProduct."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de useProduct.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/products/useProduct.spec.ts >/dev/null 2>&1) || { echo "Les tests de la fiche échouent : lancez « npx vitest run src/features/products/useProduct.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Le prefetch et useProduct doivent partager la même clé."; exit 1; }
echo "La fiche se charge, suit son identifiant, et se précharge sans doublon."
```

> 📖 [TanStack Query : préchargement](https://tanstack.com/query/v5/docs/framework/vue/guides/prefetching) · [options de requête](https://tanstack.com/query/v5/docs/framework/vue/guides/query-options)

## 04.6 - L'ajout au panier optimiste, et ce que DummyJSON ne garde pas

Une **mutation** est une écriture : elle passe par `useMutation`, et son résultat n'est pas relu comme celui d'une requête. Une mise à jour **optimiste** change l'interface **avant** la réponse du serveur, en pariant qu'elle réussira, et revient en arrière si elle échoue : le clic se sent instantané. `useMutation` offre les points d'accroche : `onMutate` s'exécute avant l'envoi, `onError` si le serveur refuse, `onSuccess` à la réussite, `onSettled` dans les deux cas.

Il faut d'abord regarder ce que DummyJSON fait vraiment. `POST /carts/add` **simule** l'ajout : la réponse est un `201` avec un panier fictif, **rien n'est enregistré** (il faut même envoyer un `userId`, sinon la réponse est un `400`). Cela a trois conséquences pour le code :

- le **panier local** (le store Pinia, persisté à l'étape 03) fait foi, pas le serveur : il n'y a aucune donnée serveur à recopier dans le cache ;
- il ne faut **pas** invalider ni recharger « le panier » après la mutation en comptant retrouver l'ajout : le serveur ne l'a pas gardé, et l'on effacerait l'état optimiste ; il en va de même du stock affiché sur les fiches, qui ne baisse jamais ;
- la mutation ne sert ici qu'à illustrer le mécanisme et son rollback. Avec un vrai serveur, vous ajouteriez un `onSettled` qui invalide la requête du panier, et le serveur ferait foi.

L'état optimiste vit donc dans le store, pas dans le cache. Le rollback demande de la réflexion : le réflexe est de sauvegarder un instantané du panier dans `onMutate` et de le restaurer dans `onError`. Mais si l'utilisateur ajoute deux produits coup sur coup, que le premier échoue après le second, la restauration de l'instantané **efface le second ajout**, qui a pourtant réussi. Le rollback correct annule **seulement ce que cette mutation a ajouté** : la quantité actuelle moins la quantité ajoutée.

Ouvrez `src/features/cart/useAddToCart.ts`. Le type `AddToCartInput` est fourni : `{ product, quantity? }`, avec une quantité de 1 par défaut.

**À vous** : écrivez `useAddToCart`, puis supprimez la première ligne du fichier.

**Critères :**

- `mutationFn` appelle `postCartAdd(product.id, quantity)` (de `@/api/products`) ;
- `onMutate` ajoute tout de suite au store (`cart.add(product, quantity)`), avant la réponse ;
- `onError` annule **seulement cet ajout**, avec `cart.setQuantity(id, quantité actuelle - quantity)` : une ligne ajoutée par cette mutation disparaît (`setQuantity` supprime la ligne quand la quantité tombe à 0 ou moins), une ligne existante retrouve sa quantité d'avant ;
- deux ajouts en vol dont un seul échoue laissent l'autre dans le panier.

```hint
Le store s'obtient avec `useCartStore()` (de `./cartStore`) au début de `useAddToCart`. La quantité actuelle d'une ligne se lit avec `cart.items.find(…)`, et vaut 0 si la ligne n'existe plus.
```

````solution
```ts
import { useMutation } from '@tanstack/vue-query'
import { postCartAdd } from '@/api/products'
import { useCartStore } from './cartStore'
import type { CartProduct } from './types'

export interface AddToCartInput {
  product: CartProduct
  quantity?: number
}

export function useAddToCart() {
  const cart = useCartStore()

  return useMutation({
    mutationFn: ({ product, quantity = 1 }: AddToCartInput) => postCartAdd(product.id, quantity),

    onMutate: ({ product, quantity = 1 }) => {
      cart.add(product, quantity) // l'interface réagit immédiatement
    },

    // Échec : on ANNULE seulement notre ajout (pas de restauration d'un instantané complet :
    // un autre ajout optimiste, encore en vol, serait perdu avec lui).
    onError: (_error, { product, quantity = 1 }) => {
      const line = cart.items.find((item) => item.id === product.id)
      cart.setQuantity(product.id, (line?.quantity ?? 0) - quantity)
    },
  })
}
```
````

```verify
D=~/byte-layers/vue/shop
F="$D/src/features/cart/useAddToCart.ts"
grep -q 'À écrire' "$F" && { echo "useAddToCart.ts contient encore « À écrire » : écrivez la mutation avec useMutation."; exit 1; }
grep -q 'eslint-disable' "$F" && { echo "Supprimez la première ligne de useAddToCart.ts (le commentaire eslint-disable) : le fichier est écrit."; exit 1; }
(cd "$D" && npx vitest run src/features/cart/useAddToCart.spec.ts >/dev/null 2>&1) || { echo "Les tests de l'ajout au panier échouent : lancez « npx vitest run src/features/cart/useAddToCart.spec.ts » dans ~/byte-layers/vue/shop et lisez le premier message. Le test « deux ajouts en vol » refuse un rollback qui restaure un instantané complet."; exit 1; }
echo "L'ajout est optimiste, et son rollback n'annule que l'ajout en échec."
```

> 📖 [TanStack Query : mises à jour optimistes](https://tanstack.com/query/v5/docs/framework/vue/guides/optimistic-updates)

## 04.7 - Installer le cache et lire la page du catalogue

Les composables sont écrits ; il reste à installer le cache dans l'application. TanStack Query a besoin d'un **`QueryClient`**, qui contient le cache, installé comme un plugin. Sans lui, un composable lève l'erreur `No 'queryClient' found in Vue context`. Dans `src/main.ts`, **ajoutez** l'import, le client avec ses options par défaut, et `VueQueryPlugin` dans la chaîne des `use` (juste après `pinia`) ; le reste du fichier ne change pas.

```ts
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

// Le cache serveur : un QueryClient partagé, installé comme un plugin.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
})

app.use(pinia).use(VueQueryPlugin, { queryClient }).use(vuetify).use(notify).use(router)
```

Les options par défaut disent : une seule nouvelle tentative après un échec (`retry: 1`), pas de rechargement automatique au retour sur l'onglet (`refetchOnWindowFocus: false`), pour que le réseau reste lisible pendant vos essais, et `networkMode: 'always'` pour les requêtes **et** les mutations. Sans ce dernier réglage, une requête lancée sans réseau est mise **en pause** au lieu d'échouer : ni erreur, ni retour en arrière de l'ajout optimiste, et la section 04.8 ne montrerait rien. Le `queryClient` est gardé dans une constante pour être passé au plugin.

Ouvrez maintenant `src/features/products/pages/ProductListPage.vue`, fournie, et repérez comment elle consomme vos composables. Le code de l'étape 02 pour la recherche y est repris : `draft` suit la frappe à l'instant, pour que le champ reste fluide, et `search`, le `customRef` avec debounce, n'est posé qu'après 300 ms de silence. Seul `search` entre dans la clé de la requête.

```ts
const draft = ref('')
const search = useDebouncedRef('', 300)
const page = ref(1)
const category = ref<string | null>(null)
const PAGE_SIZE = 12

// Une nouvelle recherche ou une nouvelle catégorie repart de la première page.
watch([search, category], () => (page.value = 1))

const { products, pageCount, isPending, isFetching, isError, error, isEmpty, refetch } =
  useProducts({ page, pageSize: PAGE_SIZE, search, category })
```

Les **états** de la requête décident de ce qu'on affiche, dans cet ordre : chargement initial, erreur avec un bouton « Réessayer », état vide, puis la liste. La liste est atténuée pendant qu'une autre page charge (`isFetching`) et la pagination ne s'affiche que s'il y a des résultats.

```vue
<v-progress-circular v-if="isPending" indeterminate data-testid="product-list-loading" />
<v-alert v-else-if="isError" type="error" variant="tonal" data-testid="product-list-error">…</v-alert>
<v-alert v-else-if="isEmpty" type="info" variant="tonal" data-testid="product-list-empty">…</v-alert>
<template v-else>
  <v-row data-testid="product-list" :class="{ 'opacity-60': isFetching }">…</v-row>
  <v-pagination v-model="page" :length="pageCount" data-testid="product-pagination" />
</template>
```

Deux remarques sur DummyJSON : sa recherche ne se combine pas avec la catégorie (le texte est prioritaire), donc la liste des catégories est désactivée tant qu'un texte est saisi ; et `v-pagination` compte les pages à partir de 1.

```verify
D=~/byte-layers/vue/shop
grep -q 'use(VueQueryPlugin' "$D/src/main.ts" || { echo "main.ts n'installe pas TanStack Query : reprenez le code de la section 04.7."; exit 1; }
grep -q 'new QueryClient' "$D/src/main.ts" || { echo "main.ts ne crée pas de QueryClient : reprenez le code de la section 04.7."; exit 1; }
grep -q "networkMode: 'always'" "$D/src/main.ts" || { echo "main.ts ne règle pas networkMode: 'always' : sans lui, les essais hors réseau de la section 04.8 ne produisent ni erreur ni rollback."; exit 1; }
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
echo "Le cache est branché sur l'application, et elle compile."
```

## 04.8 - Le catalogue dans le navigateur

Lancez le serveur de développement. Si celui de l'étape 03 tourne encore, arrêtez-le d'abord avec `Ctrl+C` : de nouveaux paquets viennent d'être installés, et Vite doit repartir de zéro.

```exec
label: "Application (laisser tourner)"
---
cd ~/byte-layers/vue/shop && npm run dev
```

Ouvrez la page `/products` à l'adresse que Vite affiche (`http://localhost:5173` en général) (rechargez si le premier chargement affiche `Failed to fetch dynamically imported module`) et ouvrez l'onglet Network des outils de développement. Faites ces essais, dans l'ordre :

1. **Pagination.** Cliquez sur « Aller à la page 2 ». La requête part avec `skip=12`, et la page 1 reste à l'écran, légèrement atténuée, jusqu'à l'arrivée de la page 2 (un instant, si votre réseau est rapide). Revenez à la page 1 dans les 30 secondes : **aucune requête** ne part, parce que la page est encore fraîche (`staleTime`). Au-delà, la requête repart en arrière-plan, et la page affichée est remplacée sans clignoter.
2. **Recherche.** Tapez `phone` à vitesse normale : une **seule** requête `search?q=phone` part, 300 ms après la dernière frappe. Tapez `zzzzzz` : le message « Aucun produit ne correspond à votre recherche » remplace la liste, la pagination disparaît, et la page est revenue à 1.
3. **Prefetch.** Effacez la recherche, puis passez la souris sur une carte : une requête `GET /products/<id>` part. Cliquez sur la carte : la fiche s'affiche tout de suite, sans indicateur de chargement.
4. **Ajout optimiste.** Dans Network, choisissez le débit « 3G lente », puis cliquez sur « Ajouter au panier » : le badge du panier monte **immédiatement**, avant que `POST /carts/add` ait répondu. Pour provoquer l'échec, bloquez cette requête : dans les outils de développement de Chromium, ouvrez le panneau « Network request blocking » (menu des trois points, More tools), ajoutez le motif `*carts/add*` et activez le blocage ; dans Firefox, clic droit sur une requête puis « Bloquer l'URL ». Cliquez de nouveau sur « Ajouter au panier » : le badge monte, puis **redescend**, et un message « Ajout de … impossible, panier inchangé » apparaît : c'est le rollback.
5. **Erreur.** Supprimez le motif précédent, ajoutez `*skip=24*` et cliquez sur « Aller à la page 3 » : après une nouvelle tentative, la liste est remplacée par une alerte d'erreur avec « Réessayer ». Retirez le motif et cliquez sur « Réessayer » : la liste revient.

On bloque des URL plutôt que de passer en mode « Hors ligne » : avec le repli local de la section 01.5, ce mode coupe aussi `localhost` et rend tout inutilisable. Avec DummyJSON, le mode « Hors ligne » donne le même résultat que le blocage, grâce au réglage `networkMode: 'always'` de la section 04.7.

Remettez le débit sur « Sans limitation » et désactivez le blocage à la fin. Si DummyJSON n'est pas joignable depuis votre poste, utilisez le repli hors ligne de la section 01.5 : la démarche est la même.

```acknowledge
J'ai vu la pagination, la recherche, le prefetch, l'ajout optimiste avec son rollback et l'état d'erreur
```

## 04.9 - Invalider le cache

Le bouton « Actualiser » de la page appelle `queryClient.invalidateQueries({ queryKey: productKeys.all })`. **Invalider** une clé marque comme périmées toutes les requêtes dont la clé **commence** par elle : ici tout le catalogue. Celles qui sont affichées sont rechargées tout de suite, les autres au prochain accès. C'est le geste à faire après une mutation qui change ce que le serveur renvoie, pour que les listes affichées se mettent à jour sans qu'on sache lesquelles sont concernées.

La hiérarchie des clés de la section 04.4 sert ce rôle : `productKeys.lists()` n'invalide que les listes et laisse les fiches en cache. Dans le navigateur, cliquez sur « Actualiser » : la requête de la page affichée repart, le bouton montre son indicateur pendant l'appel, et la liste ne clignote pas, parce qu'elle garde ses données le temps du rechargement.

Retenez la limite posée à la section 04.6 : avec DummyJSON, invalider après une écriture ne ramène rien de nouveau, puisque le serveur n'a rien enregistré. Ici l'invalidation ne fait que **recharger** la même réponse ; le panier local, lui, n'est jamais invalidé.

> 📖 [TanStack Query : invalidation](https://tanstack.com/query/v5/docs/framework/vue/guides/query-invalidation)

## 04.10 - Tout vérifier d'un coup

Avant de passer à la suite, il faut que les trois commandes de qualité du projet passent : `npm run type-check`, `npm run lint` et `npm test` (toute la suite, soit 92 tests dont les 29 de cette étape). Le bouton ci-dessous les lance pour vous, dans cet ordre, et s'arrête au premier échec.

```verify
D=~/byte-layers/vue/shop
(cd "$D" && npm run -s type-check >/dev/null 2>&1) || { echo "Le type-check échoue : lancez « npm run type-check » dans ~/byte-layers/vue/shop et lisez la première erreur."; exit 1; }
(cd "$D" && npm run -s lint >/dev/null 2>&1) || { echo "Le lint échoue : lancez « npm run lint ». Un fichier écrit garde souvent la première ligne eslint-disable, ou un import inutilisé."; exit 1; }
(cd "$D" && npm test >/dev/null 2>&1) || { echo "Des tests échouent : lancez « npm test » et lisez le premier test en échec."; exit 1; }
echo "Type-check, lint et tests passent : l'application est dans l'état de fin d'étape 04."
```

## Récap

- L'**état serveur** (une copie de ce que détient l'API) vit dans le cache de TanStack Query ; l'**état client** (panier, session) reste dans Pinia.
- La **clé** d'une requête contient tout ce dont elle dépend : changer la page ou la recherche refait l'appel, sans `watch`.
- Le catalogue est **paginé** avec `keepPreviousData` et un `staleTime`, la recherche réutilise le **debounced ref** de l'étape 02, et les états `isPending`, `isFetching`, erreur et vide sont distincts.
- `queryOptions` décrit une requête une fois, pour la lire et la **précharger** au survol.
- L'ajout au panier est **optimiste** et son rollback n'annule que sa propre quantité. DummyJSON ne persiste rien : le panier local fait foi, et on ne recharge pas un panier serveur qui n'existe pas.
- Les réponses sont **validées par Zod**, et les types s'en déduisent.

L'étape suivante branche les enchères en temps réel : un socket qui écrit dans ce même cache avec `setQueryData`.
