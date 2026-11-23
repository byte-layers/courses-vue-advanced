<script setup lang="ts">
import { provide } from 'vue'
import { CART_KEY, useCart } from './useCart'

// Un seul panier pour toute l'application : créé ici, injecté plus bas.
provide(CART_KEY, useCart())
</script>

<template>
  <slot />
</template>
