<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import RenderStats from '@/components/common/RenderStats.vue'
import AuctionCard from '../components/AuctionCard.vue'
import { useAuctionStore } from '../auctionStore'
import { useAuctions } from '../useAuctions'
import { useAuctionSocket } from '../useAuctionSocket'

// La connexion naît avec la page et meurt avec elle (onScopeDispose dans le composable).
const DEV = import.meta.env.DEV
// La modale (formulaire, historique, animations) n'est téléchargée qu'à la première ouverture.
const AuctionModal = defineAsyncComponent(() => import('../components/AuctionModal.vue'))
const { clockOffset, reconnect } = useAuctionSocket()
const store = useAuctionStore()
const { auctions, isPending } = useAuctions()

const openAuction = computed(
  () => auctions.value?.find((a) => a.productId === store.openAuctionId) ?? null,
)
</script>

<template>
  <section data-testid="auctions-page">
    <div class="d-flex align-center ga-4 mb-4">
      <h1>Enchères en direct</h1>
      <v-chip
        :color="store.connected ? 'success' : 'warning'"
        size="small"
        data-testid="auctions-connection"
      >
        {{ store.connected ? 'En direct' : 'Hors ligne' }}
      </v-chip>
    </div>

    <v-alert v-if="store.connectionError && !auctions" type="error" variant="tonal" data-testid="auctions-error">
      {{ store.connectionError }}
      <template #append>
        <v-btn variant="text" data-testid="auctions-retry" @click="reconnect()">Réessayer</v-btn>
      </template>
    </v-alert>
    <v-progress-circular v-else-if="isPending" indeterminate data-testid="auctions-loading" />
    <template v-else>
      <v-alert
        v-if="!store.connected"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
        data-testid="auctions-offline"
      >
        Connexion perdue : les prix affichés ne sont plus à jour. Reconnexion en cours.
        <template #append>
          <v-btn variant="text" data-testid="auctions-reconnect" @click="reconnect()">
            Réessayer
          </v-btn>
        </template>
      </v-alert>
      <v-row data-testid="auctions-list">
        <v-col v-for="auction in auctions" :key="auction.productId" cols="12" sm="6" md="4">
          <AuctionCard
            :auction="auction"
            :offset="clockOffset"
            @open="store.openAuction($event)"
          />
        </v-col>
      </v-row>
    </template>

    <!-- Dev seulement : le nombre de rendus par composant (voir src/lib/render-stats.ts). -->
    <RenderStats v-if="DEV" />

    <AuctionModal
      v-if="openAuction"
      :auction="openAuction"
      :offset="clockOffset"
      @close="store.closeAuction()"
    />
  </section>
</template>
