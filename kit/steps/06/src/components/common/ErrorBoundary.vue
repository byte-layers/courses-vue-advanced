<script setup lang="ts">
// TODO — À écrire : une frontière d'erreur avec `onErrorCaptured`.
//  - garde l'erreur dans une `ref` ; `onErrorCaptured((err, instance, info) => ...)` la mémorise, émet `error`
//    (avec l'erreur et `info`) et renvoie `false` : l'erreur est traitée ici et ne remonte pas à `app.config.errorHandler` ;
//  - sans erreur : le slot par défaut ; avec erreur : le slot « fallback » (reçoit `error` et `reset`),
//    par défaut un `<v-alert type="error" role="alert" data-testid="error-boundary">` avec le message
//    et un bouton `data-testid="error-boundary-retry"` « Réessayer » qui appelle `reset` ;
//  - `reset` efface l'erreur ; elle est aussi appelée quand la prop `resetKey` change (la route, par exemple).
defineProps<{ resetKey?: unknown }>()
defineEmits<{ error: [error: Error, info: string] }>()
throw new Error('À écrire')
</script>

<template>
  <slot />
</template>
