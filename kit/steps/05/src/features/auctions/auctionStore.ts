import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore'

/**
 * État de connexion et d'interface des enchères. Les DONNÉES (prix, offres) restent dans le cache
 * TanStack Query : un store pour ce que le cache ne sait pas porter (connecté ? quelle fenêtre ouverte ?).
 */
export const useAuctionStore = defineStore('auctions', () => {
  const auth = useAuthStore()
  const connected = ref(false)
  const connectionError = ref<string | null>(null)
  const openAuctionId = ref<number | null>(null)
  const guestName = ref('')

  /** Nom sous lequel on enchérit : le compte connecté, sinon le nom saisi, sinon « invité ». */
  const bidder = computed(() => auth.user?.username ?? (guestName.value.trim() || 'invité'))

  function setConnected(value: boolean) {
    connected.value = value
  }
  function setConnectionError(message: string | null) {
    connectionError.value = message
  }
  function openAuction(productId: number) {
    openAuctionId.value = productId
  }
  function closeAuction() {
    openAuctionId.value = null
  }

  return {
    connected,
    connectionError,
    openAuctionId,
    guestName,
    bidder,
    setConnected,
    setConnectionError,
    openAuction,
    closeAuction,
  }
})
