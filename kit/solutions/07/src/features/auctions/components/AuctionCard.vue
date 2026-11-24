<script setup lang="ts">
import { formatMoney } from '@/lib/money'
import { useRenderCount } from '@/lib/render-stats'
import type { AuctionState } from '@/shared/events'

defineProps<{
  auction: AuctionState
  /** Décalage d'horloge (heure du serveur moins heure du client), en ms. */
  offset: number
}>()
defineEmits<{ open: [productId: number] }>()
useRenderCount('AuctionCard')
</script>

<template>
  <v-card data-testid="auction-card" :data-product-id="auction.productId">
    <v-img :src="auction.thumbnail" :alt="auction.title" height="160" cover />
    <v-card-title data-testid="auction-card-title">{{ auction.title }}</v-card-title>
    <v-card-text>
      <div class="text-h6" data-testid="auction-card-price">{{ formatMoney(auction.price) }}</div>
      <div data-testid="auction-card-leader">
        {{ auction.leader ? `En tête : ${auction.leader}` : 'Aucune offre' }}
      </div>
      <div>
        <template v-if="auction.status === 'open'">
          Fin dans
          <strong
            v-countdown="{ endsAt: auction.endsAt, offset }"
            data-testid="auction-card-countdown"
          />
        </template>
        <v-chip v-else size="small" color="error" data-testid="auction-card-closed">
          Terminée
        </v-chip>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-btn
        color="primary"
        variant="tonal"
        data-testid="auction-card-open"
        @click="$emit('open', auction.productId)"
      >
        {{ auction.status === 'open' ? 'Enchérir' : 'Voir' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
