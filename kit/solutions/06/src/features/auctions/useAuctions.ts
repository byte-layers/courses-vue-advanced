import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { skipToken, useQuery } from '@tanstack/vue-query'
import type { AuctionState, BidEvent } from '@/shared/events'
import { auctionKeys } from './queryKeys'

/**
 * Les enchères viennent du SOCKET, pas d'une requête : `skipToken` dit « pas de fonction de lecture ».
 * La requête reste `pending` (chargement) jusqu'à ce que `useAuctionSocket` écrive la liste dans le cache
 * avec `setQueryData` ; ensuite chaque événement la met à jour.
 */
export function useAuctions() {
  const query = useQuery<AuctionState[]>({
    queryKey: auctionKeys.list(),
    queryFn: skipToken,
    staleTime: Infinity,
  })
  return { ...query, auctions: query.data }
}

/** Historique des offres d'une enchère, la plus récente en premier (vide tant qu'aucune n'est arrivée). */
export function useBidHistory(productId: MaybeRefOrGetter<number>) {
  const query = useQuery<BidEvent[]>({
    queryKey: computed(() => auctionKeys.bids(toValue(productId))),
    queryFn: skipToken,
    staleTime: Infinity,
  })
  return computed(() => query.data.value ?? [])
}
