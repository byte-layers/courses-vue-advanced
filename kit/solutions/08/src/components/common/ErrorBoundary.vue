<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'

const props = defineProps<{
  /** Quand cette valeur change (ex. la route), la frontière se réarme. */
  resetKey?: unknown
}>()
const emit = defineEmits<{ error: [error: Error, info: string] }>()

const error = ref<Error | null>(null)

// Appelé pour toute erreur levée dans un descendant (rendu, setup, hooks, gestionnaires d'événements).
onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  emit('error', error.value, info)
  // `false` : l'erreur est traitée ici, elle ne remonte pas à `app.config.errorHandler`.
  return false
})

function reset() {
  error.value = null
}
watch(() => props.resetKey, reset)
</script>

<template>
  <slot v-if="!error" />
  <slot v-else name="fallback" :error="error" :reset="reset">
    <v-alert type="error" variant="tonal" role="alert" data-testid="error-boundary">
      Cette partie de la page a rencontré une erreur : {{ error.message }}
      <template #append>
        <v-btn variant="text" data-testid="error-boundary-retry" @click="reset">Réessayer</v-btn>
      </template>
    </v-alert>
  </slot>
</template>
