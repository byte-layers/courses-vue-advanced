<script setup lang="ts">
import { formatMoney } from '@/lib/money'
import { useRenderCount } from '@/lib/render-stats'
import type { BidEvent } from '@/shared/events'

// Les offres, la plus récente en premier. `TransitionGroup` anime l'arrivée, le départ et le
// déplacement des lignes : chacune doit avoir une `key` stable (la version de l'offre).
defineProps<{ bids: readonly BidEvent[] }>()
useRenderCount('BidHistory')

const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' })
</script>

<template>
  <p v-if="bids.length === 0" data-testid="bid-history-empty">
    Aucune offre reçue depuis votre arrivée.
  </p>
  <TransitionGroup v-else tag="ul" name="bid" class="bid-history" data-testid="bid-history">
    <!--
      Les lignes sont des ÉLÉMENTS, pas un composant `BidRow` : un composant enfant de TransitionGroup est refait
      à chaque rendu du parent, même si ses props n'ont pas changé (Vue doit lui réappliquer ses hooks de
      transition). Avec une ligne par composant, chaque offre refaisait les 20 lignes.
    -->
    <li
      v-for="(bid, index) in bids"
      :key="bid.version"
      class="bid-row"
      data-testid="bid-row"
    >
      <span class="font-weight-medium">{{ bid.bidder }}</span>
      <span>{{ formatMoney(bid.price) }}</span>
      <span class="text-medium-emphasis">{{ time.format(bid.at) }}</span>
      <v-chip v-if="index === 0" size="x-small" color="success" data-testid="bid-row-leading">
        en tête
      </v-chip>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.bid-history {
  list-style: none;
  padding: 0;
  position: relative;
}
.bid-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
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
