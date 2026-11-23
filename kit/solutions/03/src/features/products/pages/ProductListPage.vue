<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue'
import { listProducts, searchProducts } from '@/api/products'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// `draft` suit la frappe à l'instant (le champ reste fluide) ;
// `query` n'est « posée » qu'après 300 ms de silence : c'est elle qui lance la requête.
const draft = ref('')
const query = useDebouncedRef('', 300)

function onInput(value: string | null) {
  draft.value = value ?? ''
  query.value = draft.value
}

// Une seule requête utile à la fois : une réponse en retard ne doit pas écraser la dernière.
let controller: AbortController | undefined

async function load() {
  controller?.abort()
  const current = (controller = new AbortController())
  loading.value = true
  error.value = null
  try {
    const q = query.value.trim()
    const result = q
      ? await searchProducts(q, current.signal)
      : await listProducts({}, current.signal)
    products.value = result.products
  } catch (e) {
    if (current.signal.aborted) return // remplacée par une requête plus récente
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (!current.signal.aborted) loading.value = false
  }
}

onMounted(load)
watch(query, load)
onScopeDispose(() => controller?.abort())
</script>

<template>
  <section>
    <h1>Catalogue</h1>
    <v-text-field
      :model-value="draft"
      label="Rechercher un produit"
      type="search"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details
      class="mb-4"
      data-testid="product-search"
      @update:model-value="onInput"
    />
    <v-progress-circular v-if="loading" indeterminate data-testid="product-list-loading" />
    <v-alert v-else-if="error" type="error" variant="tonal" data-testid="product-list-error">
      {{ error }}
    </v-alert>
    <v-alert
      v-else-if="products.length === 0"
      type="info"
      variant="tonal"
      data-testid="product-list-empty"
    >
      Aucun produit pour « {{ query }} ».
    </v-alert>
    <v-row v-else data-testid="product-list">
      <v-col v-for="product in products" :key="product.id" cols="12" sm="6" md="4" lg="3">
        <ProductCard :product="product" />
      </v-col>
    </v-row>
  </section>
</template>
