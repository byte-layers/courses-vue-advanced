<script setup lang="ts">
import { useAddToCart } from '@/features/cart/useAddToCart'
import { useNotify } from '@/plugins/notify'
import { usePrefetchProduct } from '../useProduct'
import type { Product } from '../types'

const props = defineProps<{ product: Product }>()
const notify = useNotify()
const addToCart = useAddToCart()
const prefetch = usePrefetchProduct()
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function add() {
  const { id, title, price, thumbnail } = props.product
  addToCart.mutate(
    { product: { id, title, price, thumbnail } },
    {
      onSuccess: () => notify.notify(`${title} ajouté au panier`, 'success'),
      onError: () => notify.notify(`Ajout de ${title} impossible, panier inchangé.`, 'error'),
    },
  )
}
</script>

<template>
  <v-card data-testid="product-card">
    <!-- Survol ou focus clavier : la fiche est préchargée avant le clic. -->
    <router-link
      :to="{ name: 'product', params: { id: product.id } }"
      @mouseenter="prefetch(product.id)"
      @focus="prefetch(product.id)"
    >
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
