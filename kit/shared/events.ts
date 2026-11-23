// Contrat des événements socket.io, partagé par le serveur d'enchères et l'application.
// Le serveur et le client importent ces types : une faute de frappe sur un nom d'événement
// ou sur une charge utile devient une erreur de compilation, pas un bug en direct.

export type AuctionStatus = 'open' | 'closed'

export interface AuctionState {
  productId: number
  title: string
  thumbnail: string
  /** Prix courant, en euros, côté serveur : seule référence. */
  price: number
  /** Incrémenté à chaque enchère acceptée : sert à détecter un état périmé. */
  version: number
  /** Dernier enchérisseur, ou null avant la première offre. */
  leader: string | null
  /** Fin de l'enchère, en millisecondes sur l'horloge du SERVEUR. */
  endsAt: number
  status: AuctionStatus
}

export interface BidPayload {
  productId: number
  amount: number
  bidder: string
}

export type BidAck =
  | { ok: true; price: number; version: number }
  | { ok: false; reason: 'too-low' | 'outbid' | 'closed' | 'unknown-auction'; price: number; version: number }

export interface BidEvent {
  productId: number
  price: number
  version: number
  bidder: string
  at: number
}

export interface ServerToClientEvents {
  'auction:list': (auctions: AuctionState[]) => void
  'auction:state': (state: AuctionState) => void
  'auction:bid': (bid: BidEvent) => void
  'auction:closed': (state: AuctionState) => void
  /** Heure du serveur en ms, envoyée à la connexion et toutes les 5 s. */
  'server:time': (serverNow: number) => void
}

export interface ClientToServerEvents {
  'auction:join': (productId: number, ack: (state: AuctionState | null) => void) => void
  'auction:leave': (productId: number) => void
  'auction:bid': (payload: BidPayload, ack: (result: BidAck) => void) => void
}

export const SOCKET_PORT = 4310
