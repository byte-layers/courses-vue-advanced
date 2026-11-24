<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { productKeys } from '../queryKeys'
import { useCategories, useProducts } from '../useProducts'
import ProductCard from '../components/ProductCard.vue'

// `draft` suit la frappe à l'instant ; `search` n'est « posée » qu'après 300 ms de silence (étape 02).
const draft = ref('')
const search = useDebouncedRef('', 300)
const page = ref(1)
const category = ref<string | null>(null)
const PAGE_SIZE = 12

function onInput(value: string | null) {
  draft.value = value ?? ''
  search.value = draft.value
}

// Une nouvelle recherche ou une nouvelle catégorie repart de la première page.
watch([search, category], () => (page.value = 1))

const { products, pageCount, isPending, isFetching, isError, error, isEmpty, refetch } =
  useProducts({
    page,
    pageSize: PAGE_SIZE,
    search,
    category,
  })
const { categories } = useCategories()

// Invalidation : marque tout le catalogue comme périmé, les listes affichées sont refaites.
const queryClient = useQueryClient()
function refreshCatalog() {
  return queryClient.invalidateQueries({ queryKey: productKeys.all })
}
</script>

<template>
  <section>
    <h1>Catalogue</h1>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        :model-value="draft"
        label="Rechercher un produit"
        type="search"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        class="flex-grow-1"
        data-testid="product-search"
        @update:model-value="onInput"
      />
      <v-select
        v-model="category"
        :items="categories"
        item-title="name"
        item-value="slug"
        label="Catégorie"
        clearable
        hide-details
        :disabled="draft.trim() !== ''"
        style="max-width: 260px"
        data-testid="product-category"
      />
      <v-btn
        variant="outlined"
        :loading="isFetching && !isPending"
        data-testid="product-refresh"
        @click="refreshCatalog"
      >
        Actualiser
      </v-btn>
    </div>

    <v-progress-circular v-if="isPending" indeterminate data-testid="product-list-loading" />
    <v-alert v-else-if="isError" type="error" variant="tonal" data-testid="product-list-error">
      {{ error?.message }}
      <template #append>
        <v-btn variant="text" data-testid="product-list-retry" @click="refetch()">Réessayer</v-btn>
      </template>
    </v-alert>
    <v-alert v-else-if="isEmpty" type="info" variant="tonal" data-testid="product-list-empty">
      Aucun produit ne correspond à votre recherche.
    </v-alert>
    <template v-else>
      <v-row data-testid="product-list" :class="{ 'opacity-60': isFetching }">
        <v-col v-for="product in products" :key="product.id" cols="12" sm="6" md="4" lg="3">
          <ProductCard :product="product" />
        </v-col>
      </v-row>
      <v-pagination
        v-model="page"
        :length="pageCount"
        class="mt-4"
        data-testid="product-pagination"
      />
    </template>
  </section>
</template>
