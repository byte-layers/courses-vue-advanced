<script setup lang="ts">
import { useInjectedCart } from '@/features/cart/useCart'

const cart = useInjectedCart()
</script>

<template>
  <v-app-bar :elevation="2" data-testid="header">
    <v-app-bar-title data-testid="header-title">Boutique Vue</v-app-bar-title>
    <nav class="d-flex" aria-label="Navigation principale">
      <v-btn variant="text" to="/home" data-testid="header-nav-home">Accueil</v-btn>
      <v-btn variant="text" to="/products" data-testid="header-nav-products">Produits</v-btn>
      <v-btn variant="text" to="/about" data-testid="header-nav-about">À propos</v-btn>
    </nav>
    <v-spacer />
    <v-btn icon to="/cart" aria-label="Panier" data-testid="header-cart">
      <v-icon>mdi-cart</v-icon>
      <v-badge
        v-if="cart.totalItems.value > 0"
        :content="cart.totalItems.value"
        color="primary"
        floating
        data-testid="header-cart-count"
      />
    </v-btn>
  </v-app-bar>
</template>
