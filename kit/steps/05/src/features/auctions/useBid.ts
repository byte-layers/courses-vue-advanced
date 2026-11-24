/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import { inject } from 'vue'
import { useMutation, useQueryClient, type UseMutationReturnType } from '@tanstack/vue-query'
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

/** Ce que `onMutate` mémorise pour pouvoir annuler : l'enchère telle qu'elle était. */
export interface BidContext {
  previous: AuctionState | undefined
}

/**
 * TODO — Envoie l'offre et attend l'accusé de réception (`ack`) du serveur.
 * Utilisez `socket.timeout(BID_TIMEOUT_MS).emit('auction:bid', payload, (error, ack) => ...)` :
 * le premier argument du callback est une erreur si le serveur ne répond pas à temps.
 *  - erreur : rejeter avec `new Error('Le serveur n’a pas répondu à temps.')` ;
 *  - `ack.ok === false` : rejeter avec `new BidRefusedError(ack.reason, ack.price, ack.version)` ;
 *  - sinon résoudre avec `ack`.
 */
function sendBid(socket: AuctionSocket, payload: BidPayload): Promise<BidAck> {
  throw new Error('À écrire')
}

/**
 * TODO — Enchère OPTIMISTE avec `useMutation` : le prix affiché monte tout de suite, le serveur tranche ensuite.
 * Le socket vient du paramètre, sinon de `inject(auctionSocketKey, null)` ; sans socket, lever une erreur
 * dont le message cite `useAuctionSocket`.
 *  - `mutationFn` : `sendBid` ;
 *  - `onMutate` : mémoriser l'enchère actuelle (`{ previous }`) puis, dans la liste du cache
 *    (`auctionKeys.list()`), mettre `price = payload.amount` et `leader = payload.bidder`.
 *    NE PAS toucher à `version` ni à `status` : seul le serveur les fait avancer ;
 *  - `onError` : revenir à `previous`, SAUF si la `version` de l'enchère dans le cache a avancé depuis
 *    (un événement du serveur est arrivé entre-temps : il est plus récent que notre cliché).
 * Les autres enchères de la liste gardent la même référence.
 */
export function useBid(
  socket: AuctionSocket | null = inject(auctionSocketKey, null),
): UseMutationReturnType<BidAck, Error, BidPayload, BidContext> {
  throw new Error('À écrire')
}
