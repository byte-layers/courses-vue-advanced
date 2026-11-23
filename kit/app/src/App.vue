<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import CartProvider from '@/features/cart/CartProvider.vue'
</script>

<template>
  <v-app>
    <!-- Tout ce qui est sous CartProvider peut injecter le panier. -->
    <CartProvider>
      <AppHeader />
      <v-main>
        <v-container>
          <RouterView />
        </v-container>
      </v-main>
    </CartProvider>
  </v-app>
</template>
