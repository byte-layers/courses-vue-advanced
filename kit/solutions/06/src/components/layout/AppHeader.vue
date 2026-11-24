<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore'
import { useCartStore } from '@/features/cart/cartStore'

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()

async function logout() {
  auth.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <v-app-bar :elevation="2" data-testid="header">
    <v-app-bar-title data-testid="header-title">Boutique Vue</v-app-bar-title>
    <nav class="d-flex" aria-label="Navigation principale">
      <v-btn variant="text" to="/home" data-testid="header-nav-home">Accueil</v-btn>
      <v-btn variant="text" to="/products" data-testid="header-nav-products">Produits</v-btn>
      <v-btn variant="text" to="/auctions" data-testid="header-nav-auctions">Enchères</v-btn>
      <v-btn variant="text" to="/about" data-testid="header-nav-about">À propos</v-btn>
    </nav>
    <v-spacer />
    <v-btn icon to="/cart" aria-label="Panier" data-testid="header-cart">
      <v-icon>mdi-cart</v-icon>
      <v-badge
        v-if="cart.totalItems > 0"
        :content="cart.totalItems"
        color="primary"
        floating
        data-testid="header-cart-count"
      />
    </v-btn>
    <template v-if="auth.isAuthenticated">
      <v-btn variant="text" to="/account" data-testid="header-user">{{
        auth.user?.firstName
      }}</v-btn>
      <v-btn variant="text" data-testid="header-logout" @click="logout">Déconnexion</v-btn>
    </template>
    <v-btn v-else variant="text" to="/login" data-testid="header-login">Connexion</v-btn>
  </v-app-bar>
</template>
