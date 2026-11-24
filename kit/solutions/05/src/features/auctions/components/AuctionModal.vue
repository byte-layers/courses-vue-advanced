<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatMoney } from '@/lib/money'
import type { AuctionState } from '@/shared/events'
import { useAuctionStore } from '../auctionStore'
import { useBidHistory } from '../useAuctions'
import { refusalMessage, BidRefusedError, useBid } from '../useBid'
import { useBidRules } from '../useBidRules'

const props = defineProps<{
  auction: AuctionState
  /** Décalage d'horloge (heure du serveur moins heure du client), en ms. */
  offset: number
}>()
const emit = defineEmits<{ close: [] }>()

const store = useAuctionStore()
const bid = useBid()
const { minimum, validate } = useBidRules(() => props.auction)
const history = useBidHistory(() => props.auction.productId)

const amount = ref(minimum.value)
// Le prix monte (une offre d'un autre) : on ne laisse pas un montant devenu trop bas dans le champ.
watch(minimum, (value) => {
  if (amount.value < value) amount.value = value
})

const error = ref<string | null>(null)
// Une erreur ne vaut que pour le montant qui l'a provoquée.
watch(amount, () => (error.value = null))
const closed = computed(() => props.auction.status === 'closed')

function submit() {
  error.value = validate(amount.value)
  if (error.value) return
  bid.mutate(
    {
      productId: props.auction.productId,
      amount: amount.value,
      bidder: store.bidder,
      // La version que CE client a vue : si quelqu'un enchérit entre-temps, le serveur répond `outbid`.
      expectedVersion: props.auction.version,
    },
    {
      onError: (e) => {
        error.value = e instanceof BidRefusedError ? refusalMessage(e.reason) : e.message
      },
    },
  )
}

// Annonce pour les lecteurs d'écran : on passe de « en tête » à « surenchéri ».
const announcement = ref('')
let lastBidder = props.auction.leader
watch(
  () => history.value[0],
  (latest) => {
    if (!latest) return
    if (lastBidder === store.bidder && latest.bidder !== store.bidder) {
      announcement.value = `Vous êtes surenchéri : ${latest.bidder} a offert ${formatMoney(latest.price)}.`
    }
    lastBidder = latest.bidder
  },
)
</script>

<template>
  <v-dialog :model-value="true" max-width="560" @update:model-value="emit('close')">
    <v-card data-testid="auction-modal" :title="auction.title">
      <v-card-text>
        <p class="text-h5" data-testid="auction-modal-price">{{ formatMoney(auction.price) }}</p>
        <p data-testid="auction-modal-leader">
          {{ auction.leader ? `En tête : ${auction.leader}` : 'Aucune offre pour le moment' }}
        </p>
        <p v-if="!closed">
          Fin dans
          <strong
            v-countdown="{ endsAt: auction.endsAt, offset }"
            data-testid="auction-modal-countdown"
          />
        </p>
        <v-alert v-else type="warning" variant="tonal" data-testid="auction-modal-closed">
          Cette enchère est terminée.
        </v-alert>

        <!-- Région « polie » : annoncée au lecteur d'écran sans interrompre ce qu'il lit. -->
        <div
          role="status"
          aria-live="polite"
          class="my-2"
          data-testid="auction-modal-live"
        >
          {{ announcement }}
        </div>

        <form v-if="!closed" @submit.prevent="submit">
          <v-text-field
            v-if="!store.bidder || store.bidder === 'invité'"
            v-model="store.guestName"
            label="Votre nom"
            density="compact"
            data-testid="auction-modal-bidder"
          />
          <v-text-field
            v-model.number="amount"
            label="Votre offre (€)"
            type="number"
            :min="minimum"
            step="5"
            data-testid="auction-modal-amount"
          />
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-2"
            role="alert"
            data-testid="auction-modal-error"
          >
            {{ error }}
          </v-alert>
          <v-btn
            type="submit"
            color="primary"
            :loading="bid.isPending.value"
            data-testid="auction-modal-submit"
          >
            Enchérir
          </v-btn>
        </form>

        <h3 class="text-subtitle-1 mt-4">Dernières offres</h3>
        <p v-if="history.length === 0" data-testid="auction-modal-history-empty">
          Aucune offre reçue depuis votre arrivée.
        </p>
        <ul v-else data-testid="auction-modal-history">
          <li v-for="item in history" :key="item.version" data-testid="auction-modal-bid">
            {{ item.bidder }} — {{ formatMoney(item.price) }}
          </li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn data-testid="auction-modal-close" @click="emit('close')">Fermer</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
