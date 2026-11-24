<script setup lang="ts">
import { formatMoney } from '@/lib/money'
import type { BidEvent } from '@/shared/events'

// Une ligne de l'historique. `index` sert à marquer la première (« en tête »).
defineProps<{ bid: BidEvent; index: number }>()

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
