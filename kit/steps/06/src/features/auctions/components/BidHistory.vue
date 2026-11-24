<script setup lang="ts">
import type { BidEvent } from '@/shared/events'

// TODO — À écrire : l'historique des offres, avec animation.
//  - sans offre : `<p data-testid="bid-history-empty">Aucune offre reçue depuis votre arrivée.</p>` ;
//  - sinon un `<TransitionGroup tag="ul" name="bid" data-testid="bid-history">` qui contient une `BidRow` par offre
//    (`<BidRow :bid="bid" :index="index" />`, importée de './BidRow.vue') avec `:key="bid.version"` ;
//  - le style des classes `bid-enter-from`, `bid-enter-active`, `bid-leave-active`, `bid-leave-to`, `bid-move`
//    (fondu et glissement), et `position: absolute` sur `bid-leave-active` pour que les autres lignes glissent.
defineProps<{ bids: readonly BidEvent[] }>()
throw new Error('À écrire')
</script>

<template>
  <ul data-testid="bid-history" />
</template>
