<script setup lang="ts">
// TODO — À écrire : un champ d'offre branché en `v-model` avec `defineModel`.
//  - `const model = defineModel<number>({ required: true })` ;
//  - props (avec `withDefaults`) : `min` (0), `step` (5), `label` (« Votre offre (€) ») ;
//  - boutons « − » et « + » : `model = max(min, arrondi à 2 décimales de model ± step)` ;
//    « − » désactivé si `model - step < min` ; noms accessibles « Diminuer l’offre » / « Augmenter l’offre » ;
//  - un `<v-text-field type="number">` : on n'écrit dans le modèle que des NOMBRES valides (jamais NaN, jamais vide).
//  data-testid : `bid-amount` (racine), `bid-amount-field`, `bid-amount-decrease`, `bid-amount-increase`.
defineProps<{ modelValue?: number; min?: number; step?: number; label?: string }>()
throw new Error('À écrire')
</script>

<template>
  <div data-testid="bid-amount" />
</template>
