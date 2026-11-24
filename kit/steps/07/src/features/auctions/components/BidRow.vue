<script setup lang="ts">
// Version de DÉPART de l'étape 07 (déjà instrumentée avec useRenderCount). Rien à écrire ici : à vous de voir
// pourquoi elle est refaite à chaque offre, puis de corriger BidHistory.vue (le TODO est dans ce fichier : « À écrire »).
import { formatMoney } from '@/lib/money'
import { useRenderCount } from '@/lib/render-stats'
import type { BidEvent } from '@/shared/events'

// Une ligne de l'historique. `index` sert à marquer la première (« en tête »).
defineProps<{ bid: BidEvent; index: number }>()
useRenderCount('BidRow')

const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' })
</script>

<template>
  <li class="bid-row" data-testid="bid-row">
    <span class="font-weight-medium">{{ bid.bidder }}</span>
    <span>{{ formatMoney(bid.price) }}</span>
    <span class="text-medium-emphasis">{{ time.format(bid.at) }}</span>
    <v-chip v-if="index === 0" size="x-small" color="success" data-testid="bid-row-leading">
      en tête
    </v-chip>
  </li>
</template>

<style scoped>
.bid-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}
</style>
