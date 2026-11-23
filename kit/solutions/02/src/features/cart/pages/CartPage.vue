<script setup lang="ts">
import { useInjectedCart } from '../useCart'

const cart = useInjectedCart()
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
</script>

<template>
  <section data-testid="cart-page">
    <h1>Votre panier</h1>

    <v-alert
      v-if="cart.state.items.length === 0"
      type="info"
      variant="tonal"
      data-testid="cart-empty"
    >
      Le panier est vide.
      <router-link to="/products">Voir le catalogue</router-link>
    </v-alert>

    <template v-else>
      <v-list>
        <v-list-item
          v-for="item in cart.state.items"
          :key="item.id"
          :title="item.title"
          :subtitle="money.format(item.price)"
          data-testid="cart-item"
        >
          <template #prepend>
            <v-avatar rounded><v-img :src="item.thumbnail" :alt="item.title" /></v-avatar>
          </template>
          <template #append>
            <v-btn
              icon="mdi-minus"
              size="small"
              variant="text"
              aria-label="Retirer une unité"
              data-testid="cart-item-decrease"
              @click="cart.setQuantity(item.id, item.quantity - 1)"
            />
            <span class="mx-2" data-testid="cart-item-qty" aria-label="Quantité">{{
              item.quantity
            }}</span>
            <v-btn
              icon="mdi-plus"
              size="small"
              variant="text"
              aria-label="Ajouter une unité"
              data-testid="cart-item-increase"
              @click="cart.setQuantity(item.id, item.quantity + 1)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              aria-label="Supprimer la ligne"
              data-testid="cart-item-remove"
              @click="cart.removeFromCart(item.id)"
            />
          </template>
        </v-list-item>
      </v-list>

      <p class="my-4" data-testid="cart-total">Total : {{ money.format(cart.totalPrice.value) }}</p>
      <v-btn variant="outlined" data-testid="cart-clear" @click="cart.clearCart()">
        Vider le panier
      </v-btn>
    </template>
  </section>
</template>
