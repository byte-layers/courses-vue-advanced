import type { AuctionState, BidEvent } from '@/shared/events'

/** Une enchère ouverte pour les tests ; `overrides` change ce dont le test a besoin. */
export function makeAuction(overrides: Partial<AuctionState> = {}): AuctionState {
  return {
    productId: 123,
    title: 'iPhone 13 Pro',
    thumbnail: 'https://cdn.dummyjson.com/thumbnail.webp',
    price: 450,
    version: 0,
    leader: null,
    endsAt: Date.now() + 60 * 60 * 1000,
    status: 'open',
    ...overrides,
  }
}

/** Les cinq enchères du serveur du kit (mêmes ids, mêmes prix de départ). */
export function makeAuctionList(): AuctionState[] {
  return [
    makeAuction({ productId: 123, title: 'iPhone 13 Pro', price: 450 }),
    makeAuction({ productId: 78, title: 'Apple MacBook Pro 14', price: 900 }),
    makeAuction({ productId: 94, title: 'Longines Master Collection', price: 600 }),
    makeAuction({ productId: 101, title: 'Apple AirPods Max', price: 180 }),
    makeAuction({ productId: 174, title: 'Sac Prada', price: 200 }),
  ]
}

/** Une offre acceptée, comme l'événement `auction:bid` du serveur. */
export function makeBid(overrides: Partial<BidEvent> = {}): BidEvent {
  return { productId: 123, price: 455, version: 1, bidder: 'alice-bot', at: Date.now(), ...overrides }
}
