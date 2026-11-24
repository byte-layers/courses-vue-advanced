<script setup lang="ts">
import type { BidEvent } from '@/shared/events'
import BidRow from './BidRow.vue'

// Les offres, la plus récente en premier. `TransitionGroup` anime l'arrivée, le départ et le
// déplacement des lignes : chacune doit avoir une `key` stable (la version de l'offre).
defineProps<{ bids: readonly BidEvent[] }>()
</script>

<template>
  <p v-if="bids.length === 0" data-testid="bid-history-empty">
    Aucune offre reçue depuis votre arrivée.
  </p>
  <TransitionGroup v-else tag="ul" name="bid" class="bid-history" data-testid="bid-history">
    <BidRow v-for="(bid, index) in bids" :key="bid.version" :bid="bid" :index="index" />
  </TransitionGroup>
</template>

<style scoped>
.bid-history {
  list-style: none;
  padding: 0;
  position: relative;
}
.bid-enter-active,
.bid-leave-active,
.bid-move {
  transition: all 0.3s ease;
}
.bid-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.bid-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
/* Une ligne qui sort ne doit plus occuper de place : les autres se déplacent en douceur. */
.bid-leave-active {
  position: absolute;
}
</style>
