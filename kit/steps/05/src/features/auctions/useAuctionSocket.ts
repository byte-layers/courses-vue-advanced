/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { AuctionState } from '@/shared/events'
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
 * TODO — Connecte l'application au serveur d'enchères et recopie chaque événement dans le cache
 * TanStack Query. À appeler dans `setup()` (ou dans une `effectScope`) : la connexion dure autant que ce scope.
 *
 * Le socket : `options.socket`, sinon `inject(auctionSocketKey, null)` (si `hasInjectionContext()`),
 * sinon `createAuctionSocket()`. Dans un composant (`getCurrentInstance()`), `provide(auctionSocketKey, socket)`
 * pour que la modale et `useBid` retrouvent le même socket.
 *
 *  1. `clockOffset` (ref, 0 au départ) = `serverNow reçu - Date.now()` à chaque `server:time` ;
 *     `serverNow()` = `Date.now() + clockOffset.value`.
 *  2. Un `Set` des enchères rejointes. `join(id)` l'ajoute et, si `socket.connected`, émet
 *     `auction:join` : la réponse (`ack`) porte l'état, à passer à `applyState`. `leave(id)` le retire et
 *     émet `auction:leave` (si connecté).
 *  3. Événements : `auction:list` -> `setQueryData(auctionKeys.list(), liste)`, puis `join` de chaque enchère
 *     (le serveur n'envoie les offres que des rooms rejointes) ; si une version RECULE par rapport au cache,
 *     le serveur a été remis à zéro : vider l'historique (`auctionKeys.bids(id)`). `auction:state`,
 *     `auction:bid` (liste ET historique via `pushBid`), `auction:closed` : `setQueryData` avec les fonctions
 *     de `auctionCache.ts`.
 *  4. `connect` : `store.setConnected(true)`, effacer l'erreur, et REJOINDRE de nouveau toutes les enchères
 *     du Set (le serveur ne se souvient de rien après une coupure). `disconnect` : `setConnected(false)`.
 *     `connect_error` : `setConnected(false)` et `setConnectionError("Serveur d'enchères injoignable.")`.
 *  5. `onScopeDispose` : retirer TOUS vos écouteurs (`socket.off`) puis `socket.disconnect()`.
 *  6. Appeler `socket.connect()` (le socket est créé avec `autoConnect: false`).
 */
export function useAuctionSocket(_options: UseAuctionSocketOptions = {}): UseAuctionSocketReturn {
  throw new Error('À écrire')
}
