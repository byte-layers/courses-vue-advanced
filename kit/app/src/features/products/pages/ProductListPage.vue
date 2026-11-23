<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listProducts } from '@/api/products'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    products.value = (await listProducts()).products
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <h1>Catalogue</h1>
    <v-progress-circular v-if="loading" indeterminate data-testid="product-list-loading" />
    <v-alert v-else-if="error" type="error" variant="tonal" data-testid="product-list-error">
      {{ error }}
    </v-alert>
    <v-row v-else data-testid="product-list">
      <v-col v-for="product in products" :key="product.id" cols="12" sm="6" md="4" lg="3">
        <ProductCard :product="product" />
      </v-col>
    </v-row>
  </section>
</template>
