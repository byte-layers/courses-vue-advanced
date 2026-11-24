<script setup lang="ts">
import { ref } from 'vue'
import { useForm, type FieldState } from 'vee-validate'
import { formatMoney } from '@/lib/money'
import { useAuthStore } from '@/features/auth/authStore'
import { useCartStore } from '@/features/cart/cartStore'
import { checkoutSchema, type CheckoutInput } from '../checkoutSchema'
import { toVeeSchema } from '../toVeeSchema'

const cart = useCartStore()
const auth = useAuthStore()

const { defineField, handleSubmit, errors, isSubmitting } = useForm<CheckoutInput>({
  validationSchema: toVeeSchema(checkoutSchema),
  initialValues: {
    fullName: auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    delivery: 'standard',
  },
})

// Vuetify affiche les messages via la prop `error-messages` ; on valide à la sortie du champ.
const config = {
  props: (state: FieldState) => ({ 'error-messages': state.errors }),
  validateOnModelUpdate: false,
  validateOnChange: false,
}
const [fullName, fullNameProps] = defineField('fullName', config)
const [email, emailProps] = defineField('email', config)
const [address, addressProps] = defineField('address', config)
const [postalCode, postalCodeProps] = defineField('postalCode', config)
const [city, cityProps] = defineField('city', config)
const [delivery] = defineField('delivery')
const [acceptTerms, acceptTermsProps] = defineField('acceptTerms', {
  props: (state: FieldState) => ({ 'error-messages': state.errors }),
})

const orderId = ref<string | null>(null)

// `handleSubmit` ne appelle notre fonction que si le schéma accepte TOUTES les valeurs.
const submit = handleSubmit(() => {
  // DummyJSON ne persiste rien : la commande est simulée, le panier local est vidé.
  orderId.value = `CMD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  cart.clear()
})
</script>

<template>
  <section data-testid="checkout-page">
    <h1>Finaliser la commande</h1>

    <v-alert v-if="orderId" type="success" variant="tonal" data-testid="checkout-confirmation">
      Commande {{ orderId }} enregistrée (simulée : DummyJSON ne conserve rien).
      <router-link to="/products">Retour au catalogue</router-link>
    </v-alert>

    <v-alert v-else-if="cart.items.length === 0" type="info" variant="tonal" data-testid="checkout-empty">
      Votre panier est vide. <router-link to="/products">Voir le catalogue</router-link>
    </v-alert>

    <form v-else novalidate data-testid="checkout-form" @submit.prevent="submit">
      <p class="mb-4" data-testid="checkout-total">
        {{ cart.totalItems }} article(s), total : {{ formatMoney(cart.totalPrice) }}
      </p>
      <v-text-field v-model="fullName" v-bind="fullNameProps" label="Nom complet" autocomplete="name" data-testid="checkout-fullname" />
      <v-text-field v-model="email" v-bind="emailProps" label="E-mail" type="email" autocomplete="email" data-testid="checkout-email" />
      <v-text-field v-model="address" v-bind="addressProps" label="Adresse" autocomplete="street-address" data-testid="checkout-address" />
      <div class="d-flex ga-4">
        <v-text-field v-model="postalCode" v-bind="postalCodeProps" label="Code postal" autocomplete="postal-code" data-testid="checkout-postalcode" />
        <v-text-field v-model="city" v-bind="cityProps" label="Ville" autocomplete="address-level2" data-testid="checkout-city" />
      </div>
      <v-radio-group v-model="delivery" label="Livraison" inline data-testid="checkout-delivery">
        <v-radio label="Standard" value="standard" />
        <v-radio label="Express" value="express" />
      </v-radio-group>
      <v-checkbox v-model="acceptTerms" v-bind="acceptTermsProps" label="J’accepte les conditions de vente" data-testid="checkout-terms" />
      <v-btn type="submit" color="primary" :loading="isSubmitting" data-testid="checkout-submit">
        Commander
      </v-btn>
      <p v-if="Object.keys(errors).length" class="text-error mt-2" role="alert" data-testid="checkout-summary">
        {{ Object.keys(errors).length }} champ(s) à corriger.
      </p>
    </form>
  </section>
</template>
