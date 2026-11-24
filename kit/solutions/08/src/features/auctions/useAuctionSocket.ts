import {
  getCurrentInstance,
  hasInjectionContext,
  inject,
  onScopeDispose,
  provide,
  ref,
  type Ref,
} from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { AuctionState, BidEvent, ServerToClientEvents } from '@/shared/events'
import { applyBid, applyClosed, applyState, pushBid } from './auctionCache'
import { auctionSocketKey, createAuctionSocket, type AuctionSocket } from './auctionSocket'
import { useAuctionStore } from './auctionStore'
import { auctionKeys } from './queryKeys'

export interface UseAuctionSocketOptions {
  /** Un socket déjà créé (tests) ; sinon celui fourni par `provide`, sinon un vrai socket vers VITE_SOCKET_URL. */
  socket?: AuctionSocket
}

export interface UseAuctionSocketReturn {
  /** Le socket utilisé (typé avec les événements partagés). */
  socket: AuctionSocket
  /** Décalage d'horloge : heure du serveur moins heure du client, en ms. */
  clockOffset: Ref<number>
  /** L'heure du serveur « maintenant », en ms. */
  serverNow: () => number
  join: (productId: number) => void
  leave: (productId: number) => void
  /** Relance la connexion (bouton « Réessayer »). */
  reconnect: () => void
}

/**
 * Connecte l'application au serveur d'enchères et recopie chaque événement dans le cache TanStack Query.
 * À appeler dans `setup()` (ou dans une `effectScope`) : la connexion dure autant que ce scope.
 */
export function useAuctionSocket(options: UseAuctionSocketOptions = {}): UseAuctionSocketReturn {
  const queryClient = useQueryClient()
  const store = useAuctionStore()
  const socket =
    options.socket ??
    (hasInjectionContext() ? inject(auctionSocketKey, null) : null) ??
    createAuctionSocket()

  // Les composants enfants (modale, formulaire d'offre) retrouvent le même socket par `inject`.
  if (getCurrentInstance()) provide(auctionSocketKey, socket)

  /** Décalage d'horloge : heure du serveur moins heure du client, en ms (0 tant qu'on n'a rien reçu). */
  const clockOffset = ref(0)
  const serverNow = () => Date.now() + clockOffset.value

  // Les rooms rejointes : à refaire à chaque (re)connexion, le serveur ne s'en souvient pas.
  const joined = new Set<number>()

  function patchList(update: (current: AuctionState[] | undefined) => AuctionState[] | undefined) {
    queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), update)
  }

  function emitJoin(productId: number) {
    socket.emit('auction:join', productId, (state) => {
      if (state) patchList((current) => applyState(current, state))
    })
  }

  function join(productId: number) {
    joined.add(productId)
    if (socket.connected) emitJoin(productId)
  }

  function leave(productId: number) {
    joined.delete(productId)
    if (socket.connected) socket.emit('auction:leave', productId)
  }

  const handlers: Partial<ServerToClientEvents> = {
    'server:time': (serverTime) => {
      clockOffset.value = serverTime - Date.now()
    },
    'auction:list': (list) => {
      // Un prix ou une version plus bas que ce qu'on connaissait : le serveur a été remis à zéro.
      const previous = queryClient.getQueryData<AuctionState[]>(auctionKeys.list())
      for (const auction of list) {
        const before = previous?.find((a) => a.productId === auction.productId)
        if (before && auction.version < before.version) {
          queryClient.setQueryData<BidEvent[]>(auctionKeys.bids(auction.productId), [])
        }
      }
      queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), list)
      for (const auction of list) join(auction.productId)
    },
    'auction:state': (state) => patchList((current) => applyState(current, state)),
    'auction:bid': (bid) => {
      patchList((current) => applyBid(current, bid))
      queryClient.setQueryData<BidEvent[]>(auctionKeys.bids(bid.productId), (history) =>
        pushBid(history, bid),
      )
    },
    'auction:closed': (state) => patchList((current) => applyClosed(current, state)),
  }

  function onConnect() {
    store.setConnected(true)
    store.setConnectionError(null)
    // Resynchronisation : on rejoint les rooms, chaque réponse porte l'état à jour.
    for (const productId of joined) emitJoin(productId)
  }
  function onDisconnect() {
    store.setConnected(false)
  }
  function onConnectError() {
    store.setConnected(false)
    store.setConnectionError("Serveur d'enchères injoignable.")
  }

  socket.on('connect', onConnect)
  socket.on('disconnect', onDisconnect)
  socket.on('connect_error', onConnectError)
  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event as keyof ServerToClientEvents, handler as never)
  }

  // Fin du scope : on retire nos écouteurs et on ferme la connexion, rien ne reste ouvert.
  onScopeDispose(() => {
    socket.off('connect', onConnect)
    socket.off('disconnect', onDisconnect)
    socket.off('connect_error', onConnectError)
    for (const [event, handler] of Object.entries(handlers)) {
      socket.off(event as keyof ServerToClientEvents, handler as never)
    }
    socket.disconnect()
    store.setConnected(false)
  })

  socket.connect()

  return { socket, clockOffset, serverNow, join, leave, reconnect: () => socket.connect() }
}
