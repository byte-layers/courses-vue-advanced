<script setup lang="ts">
import { useCartStore } from '@/features/cart/cartStore'
import { useNotify } from '@/plugins/notify'
import type { Product } from '../types'

const props = defineProps<{ product: Product }>()
const cart = useCartStore()
const notify = useNotify()
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function add() {
  const { id, title, price, thumbnail } = props.product
  cart.add({ id, title, price, thumbnail })
  notify.notify(`${title} ajouté au panier`, 'success')
}
</script>

<template>
  <v-card data-testid="product-card">
    <router-link :to="{ name: 'product', params: { id: product.id } }">
      <v-img :src="product.thumbnail" :alt="product.title" height="180" cover />
    </router-link>
    <v-card-title data-testid="product-card-title">{{ product.title }}</v-card-title>
    <v-card-subtitle data-testid="product-card-price">{{
      money.format(product.price)
    }}</v-card-subtitle>
    <v-card-actions>
      <v-btn color="primary" variant="tonal" data-testid="product-card-add" @click="add">
        Ajouter au panier
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
