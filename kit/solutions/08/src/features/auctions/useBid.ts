import { useMutation, useQueryClient, type UseMutationReturnType } from '@tanstack/vue-query'
import { inject } from 'vue'
import type { AuctionState, BidAck, BidPayload } from '@/shared/events'
import { auctionSocketKey, type AuctionSocket } from './auctionSocket'
import { auctionKeys } from './queryKeys'

/** Délai d'attente de la réponse du serveur, en ms. Sans réponse, l'offre est annulée. */
export const BID_TIMEOUT_MS = 5000

export type BidRefusal = Extract<BidAck, { ok: false }>['reason']

/** Le serveur a refusé l'offre. `price` et `version` sont ceux qu'il connaît à cet instant. */
export class BidRefusedError extends Error {
  constructor(
    readonly reason: BidRefusal,
    readonly price: number,
    readonly version: number,
  ) {
    super(`Offre refusée : ${reason}`)
    this.name = 'BidRefusedError'
  }
}

/** Phrase lisible pour chaque motif de refus. */
export function refusalMessage(reason: BidRefusal): string {
  switch (reason) {
    case 'too-low':
      return 'Offre trop basse : le prix a changé ou le pas minimal n’est pas respecté.'
    case 'outbid':
      return 'Quelqu’un a enchéri avant vous : votre offre n’a pas été retenue.'
    case 'closed':
      return 'L’enchère est terminée.'
    default:
      return 'Cette enchère n’existe pas.'
  }
}

/** Envoie l'offre et attend l'accusé de réception (`ack`) : résout si acceptée, rejette sinon. */
function sendBid(socket: AuctionSocket, payload: BidPayload): Promise<BidAck> {
  return new Promise((resolve, reject) => {
    socket.timeout(BID_TIMEOUT_MS).emit('auction:bid', payload, (error, ack) => {
      if (error) return reject(new Error('Le serveur n’a pas répondu à temps.'))
      if (!ack.ok) return reject(new BidRefusedError(ack.reason, ack.price, ack.version))
      resolve(ack)
    })
  })
}

/** Ce que `onMutate` mémorise pour pouvoir annuler : l'enchère telle qu'elle était. */
export interface BidContext {
  previous: AuctionState | undefined
}

/**
 * Enchère OPTIMISTE : le prix affiché monte tout de suite, le serveur tranche ensuite.
 * Refus ou délai dépassé : on revient à l'état d'avant, sauf si un événement plus récent est arrivé entre-temps.
 */
export function useBid(
  socket: AuctionSocket | null = inject(auctionSocketKey, null),
): UseMutationReturnType<BidAck, Error, BidPayload, BidContext> {
  if (!socket) throw new Error('Aucun socket : appelez useAuctionSocket() dans un composant parent.')
  const queryClient = useQueryClient()

  function patch(productId: number, update: (auction: AuctionState) => AuctionState) {
    queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), (list) =>
      list?.map((a) => (a.productId === productId ? update(a) : a)),
    )
  }

  return useMutation<BidAck, Error, BidPayload, BidContext>({
    mutationFn: (payload) => sendBid(socket, payload),

    onMutate: (payload) => {
      const list = queryClient.getQueryData<AuctionState[]>(auctionKeys.list())
      const previous = list?.find((a) => a.productId === payload.productId)
      // Ni `version` ni `status` ne bougent : seul le serveur les fait avancer.
      patch(payload.productId, (a) => ({ ...a, price: payload.amount, leader: payload.bidder }))
      return { previous }
    },

    onError: (_error, payload, context) => {
      const previous = context?.previous
      if (!previous) return
      // Si la version a avancé, un événement du serveur est arrivé : il est plus récent que notre cliché.
      patch(payload.productId, (a) => (a.version === previous.version ? previous : a))
    },
  })
}
