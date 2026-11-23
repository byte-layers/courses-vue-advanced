<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getProduct } from '@/api/products'
import { useInjectedCart } from '@/features/cart/useCart'
import type { Product } from '../types'

const props = defineProps<{ id: number }>()
const cart = useInjectedCart()
const product = ref<Product | null>(null)
const error = ref<string | null>(null)
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

onMounted(async () => {
  try {
    product.value = await getProduct(props.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

function add(p: Product) {
  cart.addToCart({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail })
}
</script>

<template>
  <section data-testid="product-detail">
    <v-btn variant="text" to="/products" prepend-icon="mdi-arrow-left">Catalogue</v-btn>
    <v-alert v-if="error" type="error" variant="tonal" data-testid="product-detail-error">
      {{ error }}
    </v-alert>
    <v-progress-circular v-else-if="!product" indeterminate />
    <v-row v-else>
      <v-col cols="12" md="5"><v-img :src="product.thumbnail" :alt="product.title" /></v-col>
      <v-col cols="12" md="7">
        <h1 data-testid="product-detail-title">{{ product.title }}</h1>
        <p>{{ product.description }}</p>
        <p data-testid="product-detail-price">{{ money.format(product.price) }}</p>
        <p>Stock : {{ product.stock }}</p>
        <v-btn color="primary" data-testid="product-detail-add" @click="add(product)">
          Ajouter au panier
        </v-btn>
      </v-col>
    </v-row>
  </section>
</template>
