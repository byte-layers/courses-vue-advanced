<script setup lang="ts">
import { computed } from 'vue'
import { useNotify } from '@/plugins/notify'

// Affiche la première notification de la file ; la suivante prend sa place à la fermeture.
const notify = useNotify()
const current = computed(() => notify.queue[0])
</script>

<template>
  <v-snackbar
    v-if="current"
    :key="current.id"
    :model-value="true"
    :timeout="current.timeout"
    :color="current.kind === 'info' ? undefined : current.kind"
    data-testid="notify"
    @update:model-value="notify.dismiss(current.id)"
  >
    {{ current.message }}
  </v-snackbar>
</template>
