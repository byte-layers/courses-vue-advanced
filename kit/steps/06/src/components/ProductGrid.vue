<script setup lang="ts">
// TODO — À écrire : rendez ce composant GÉNÉRIQUE.
//  - `<script setup lang="ts" generic="T extends { id: number }">` : `T` est le type des éléments, déduit de `items` ;
//  - props : `items: readonly T[]` ;
//  - `defineSlots` : `item(props: { item: T; index: number })`, `empty?()` et `header?(props: { count: number })` ;
//  - gabarit : `data-testid="product-grid"` à la racine ; le slot « header » (reçoit `count`) ; si `items` est vide,
//    `<div data-testid="product-grid-empty">` avec le slot « empty » (texte par défaut « Rien à afficher. ») ;
//    sinon un `<v-row>` avec une `<v-col data-testid="product-grid-cell" cols="12" sm="6" md="4" lg="3">` par élément,
//    clée par `item.id`, qui contient le slot « item ».
defineProps<{ items: readonly { id: number }[] }>()
throw new Error('À écrire')
</script>

<template>
  <div data-testid="product-grid" />
</template>
