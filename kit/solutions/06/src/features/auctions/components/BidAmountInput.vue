<script setup lang="ts">
// `defineModel` : le composant se branche avec `v-model` sans écrire props + emit à la main.
const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Plus petite offre permise. */
    min?: number
    /** Valeur ajoutée ou retirée par les boutons + et −. */
    step?: number
    label?: string
  }>(),
  { min: 0, step: 5, label: 'Votre offre (€)' },
)

const round2 = (n: number) => Math.round(n * 100) / 100

function bump(delta: number) {
  model.value = Math.max(props.min, round2(model.value + delta))
}

// Le champ renvoie du texte : on n'écrit dans le modèle que des NOMBRES valides.
function onInput(value: string | null) {
  const amount = Number(value)
  if (value !== null && value.trim() !== '' && Number.isFinite(amount)) model.value = amount
}
</script>

<template>
  <div class="d-flex align-center ga-2" data-testid="bid-amount">
    <v-btn
      icon="mdi-minus"
      variant="outlined"
      size="small"
      aria-label="Diminuer l’offre"
      :disabled="model - step < min"
      data-testid="bid-amount-decrease"
      @click="bump(-step)"
    />
    <v-text-field
      :model-value="model"
      :label="label"
      type="number"
      :min="min"
      :step="step"
      hide-details
      density="compact"
      data-testid="bid-amount-field"
      @update:model-value="onInput"
    />
    <v-btn
      icon="mdi-plus"
      variant="outlined"
      size="small"
      aria-label="Augmenter l’offre"
      data-testid="bid-amount-increase"
      @click="bump(step)"
    />
  </div>
</template>
