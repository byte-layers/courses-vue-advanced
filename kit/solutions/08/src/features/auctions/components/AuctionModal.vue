<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { formatMoney } from '@/lib/money'
import type { AuctionState } from '@/shared/events'
import { useAuctionStore } from '../auctionStore'
import { useBidHistory } from '../useAuctions'
import { refusalMessage, BidRefusedError, useBid } from '../useBid'
import { BID_STEP, useBidRules } from '../useBidRules'
import BidAmountInput from './BidAmountInput.vue'
import BidHistory from './BidHistory.vue'

const props = defineProps<{
  auction: AuctionState
  /** Décalage d'horloge (heure du serveur moins heure du client), en ms. */
  offset: number
}>()
const emit = defineEmits<{ close: [] }>()

const store = useAuctionStore()
const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
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

// Accessibilité d'une modale native : le focus entre dedans, Échap la ferme, le focus revient où il était.
const opener = document.activeElement as HTMLElement | null
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  dialog.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  opener?.focus?.()
})

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
  <!-- Téléportée dans #modals (voir App.vue), hors de la page : pas de z-index ni d'overflow du parent. -->
  <Teleport to="#modals">
    <div class="modal-backdrop" data-testid="auction-modal-backdrop" @click.self="emit('close')">
      <v-card
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="modal-card"
        data-testid="auction-modal"
      >
        <div ref="dialog" tabindex="-1" class="modal-focus">
          <v-card-title :id="titleId">{{ auction.title }}</v-card-title>
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
            <div role="status" aria-live="polite" class="my-2" data-testid="auction-modal-live">
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
              <BidAmountInput
                v-model="amount"
                :min="minimum"
                :step="BID_STEP"
                data-testid="auction-modal-amount"
              />
              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                density="compact"
                class="my-2"
                role="alert"
                data-testid="auction-modal-error"
              >
                {{ error }}
              </v-alert>
              <v-btn
                type="submit"
                color="primary"
                class="mt-2"
                :loading="bid.isPending.value"
                data-testid="auction-modal-submit"
              >
                Enchérir
              </v-btn>
            </form>

            <h3 class="text-subtitle-1 mt-4">Dernières offres</h3>
            <BidHistory :bids="history" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn data-testid="auction-modal-close" @click="emit('close')">Fermer</v-btn>
          </v-card-actions>
        </div>
      </v-card>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 50%);
}
.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-focus:focus {
  outline: none;
}
</style>
