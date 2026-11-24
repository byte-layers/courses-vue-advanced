import { io, type Socket } from 'socket.io-client'
import type { InjectionKey } from 'vue'
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/events'

/** Le socket TYPÉ : un nom d'événement ou une charge utile erronés ne compilent pas. */
export type AuctionSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/** Adresse du serveur d'enchères : VITE_SOCKET_URL, sinon le port du kit. */
export const SOCKET_URL: string = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4310'

/** Permet de fournir un autre socket (un faux, dans les tests) à toute une arborescence de composants. */
export const auctionSocketKey: InjectionKey<AuctionSocket> = Symbol('auctionSocket')

/** Crée le socket SANS le connecter : c'est `useAuctionSocket` qui décide du moment (et de la fin). */
export function createAuctionSocket(url: string = SOCKET_URL): AuctionSocket {
  return io(url, { autoConnect: false, reconnectionDelayMax: 3000 })
}
