import type { AuctionState, BidEvent } from '@/shared/events'

/** Nombre d'offres gardées par enchère dans l'historique. */
export const HISTORY_LIMIT = 20

/**
 * Fonctions PURES qui disent comment un événement du serveur modifie le cache.
 * `useAuctionSocket` les passe à `queryClient.setQueryData(clé, (ancien) => applyX(ancien, événement))`.
 * Règle commune : ne jamais muter l'ancien tableau, et rendre le MÊME tableau quand rien ne change
 * (TanStack Query ne notifie pas si la référence est identique).
 */

/** `auction:bid` : une offre acceptée. Ignorée si on connaît déjà cette version (ou une plus récente). */
export function applyBid(
  current: AuctionState[] | undefined,
  bid: BidEvent,
): AuctionState[] | undefined {
  if (!current) return current
  const auction = current.find((a) => a.productId === bid.productId)
  if (!auction || bid.version <= auction.version) return current
  const updated: AuctionState = {
    ...auction,
    price: bid.price,
    version: bid.version,
    leader: bid.bidder,
  }
  return current.map((a) => (a === auction ? updated : a))
}

/** `auction:state` : l'état complet d'une enchère (après un `join`, un reset). Un état plus ancien est ignoré. */
export function applyState(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  if (!current) return [state]
  const auction = current.find((a) => a.productId === state.productId)
  if (!auction) return [...current, state]
  if (state.status === 'open' && state.version < auction.version) return current
  return current.map((a) => (a === auction ? state : a))
}

/** `auction:closed` : la fermeture est définitive, elle remplace toujours l'état connu. */
export function applyClosed(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  if (!current) return [state]
  const index = current.findIndex((a) => a.productId === state.productId)
  if (index === -1) return [...current, state]
  return current.map((a, i) => (i === index ? state : a))
}

/** Ajoute une offre en tête de l'historique (sans doublon de version), limité à `HISTORY_LIMIT`. */
export function pushBid(history: BidEvent[] | undefined, bid: BidEvent): BidEvent[] {
  if (!history) return [bid]
  if (history.some((b) => b.version === bid.version)) return history
  return [bid, ...history].slice(0, HISTORY_LIMIT)
}
