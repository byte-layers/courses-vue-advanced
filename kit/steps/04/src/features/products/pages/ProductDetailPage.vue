<script setup lang="ts">
import { useProduct } from '../useProduct'
import { useAddToCart } from '@/features/cart/useAddToCart'
import { useNotify } from '@/plugins/notify'

const props = defineProps<{ id: number }>()
const notify = useNotify()
const { data: product, isPending, isError, error } = useProduct(() => props.id)
const addToCart = useAddToCart()
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function add() {
  if (!product.value) return
  const { id, title, price, thumbnail } = product.value
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
  <section data-testid="product-detail">
    <v-btn variant="text" to="/products" prepend-icon="mdi-arrow-left">Catalogue</v-btn>
    <v-progress-circular v-if="isPending" indeterminate />
    <v-alert v-else-if="isError" type="error" variant="tonal" data-testid="product-detail-error">
      {{ error?.message }}
    </v-alert>
    <v-row v-else-if="product">
      <v-col cols="12" md="5"><v-img :src="product.thumbnail" :alt="product.title" /></v-col>
      <v-col cols="12" md="7">
        <h1 data-testid="product-detail-title">{{ product.title }}</h1>
        <p>{{ product.description }}</p>
        <p data-testid="product-detail-price">{{ money.format(product.price) }}</p>
        <p>Stock : {{ product.stock }}</p>
        <v-btn color="primary" data-testid="product-detail-add" @click="add"
          >Ajouter au panier</v-btn
        >
      </v-col>
    </v-row>
  </section>
</template>
