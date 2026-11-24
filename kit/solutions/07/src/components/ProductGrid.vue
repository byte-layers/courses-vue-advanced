<script setup lang="ts" generic="T extends { id: number }">
// Composant GÉNÉRIQUE : `T` est le type des éléments, déduit de `items`.
// Les slots sont typés avec `defineSlots` : dans `#item="{ item }"`, `item` est un `T`, pas un `any`.
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
