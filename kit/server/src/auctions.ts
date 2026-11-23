// Moteur d'enchères : toute la vérité (prix, version, leader, fin) vit ici, côté serveur.
// Le moteur ne connaît pas socket.io : il appelle des écouteurs, c'est app.ts qui diffuse.
import type { AuctionState, BidAck, BidEvent, BidPayload } from '../../shared/events.ts'

/** Les 5 produits DummyJSON mis aux enchères (ids fixes) et leur prix de départ. */
export const AUCTION_ITEMS: { productId: number; startPrice: number }[] = [
  { productId: 123, startPrice: 450 }, // iPhone 13 Pro (prix catalogue 1099,99)
  { productId: 78, startPrice: 900 }, // Apple MacBook Pro 14 (1999,99)
  { productId: 94, startPrice: 600 }, // Longines Master Collection (1499,99)
  { productId: 101, startPrice: 180 }, // AirPods Max (549,99)
  { productId: 174, startPrice: 200 }, // Sac Prada (599,99)
]

export interface AuctionListeners {
  onBid(bid: BidEvent): void
  onClosed(state: AuctionState): void
}

interface ProductInfo {
  id: number
  title: string
  thumbnail: string
}

export const round2 = (n: number) => Math.round(n * 100) / 100

export class AuctionEngine {
  auctions = new Map<number, AuctionState>()
  #timers = new Map<number, ReturnType<typeof setTimeout>>()
  #products: ProductInfo[]
  #durationMs: number
  #step: number
  #listeners: AuctionListeners

  constructor(products: ProductInfo[], opts: { durationSeconds: number; step: number }, listeners: AuctionListeners) {
    this.#products = products
    this.#durationMs = opts.durationSeconds * 1000
    this.#step = opts.step
    this.#listeners = listeners
    this.reset()
  }

  get step() {
    return this.#step
  }

  list(): AuctionState[] {
    return [...this.auctions.values()]
  }

  /** Remet les 5 enchères à zéro ; `durationSeconds` change la durée pour cette fois et les suivantes. */
  reset(durationSeconds?: number) {
    if (durationSeconds !== undefined) this.#durationMs = durationSeconds * 1000
    for (const t of this.#timers.values()) clearTimeout(t)
    this.#timers.clear()
    this.auctions.clear()
    const endsAt = Date.now() + this.#durationMs
    for (const { productId, startPrice } of AUCTION_ITEMS) {
      const p = this.#products.find((x) => x.id === productId)
      if (!p) throw new Error(`Produit ${productId} absent de data/products.json`)
      this.auctions.set(productId, {
        productId,
        title: p.title,
        thumbnail: p.thumbnail,
        price: startPrice,
        version: 0,
        leader: null,
        endsAt,
        status: 'open',
      })
      // Fermeture automatique à endsAt (setTimeout plafonné à ~24 jours).
      const delay = Math.min(this.#durationMs, 2 ** 31 - 1)
      this.#timers.set(productId, setTimeout(() => this.close(productId), delay).unref())
    }
  }

  /** Ferme une enchère (appelée à endsAt, ou à la main par /control/close). */
  close(productId: number) {
    const a = this.auctions.get(productId)
    if (!a || a.status === 'closed') return
    a.status = 'closed'
    a.endsAt = Math.min(a.endsAt, Date.now())
    clearTimeout(this.#timers.get(productId))
    this.#listeners.onClosed({ ...a })
  }

  /** Traite une enchère. `minStep` permet au ticker rapide de monter par centimes. */
  bid(payload: BidPayload, minStep = this.#step): BidAck {
    const a = this.auctions.get(payload?.productId)
    if (!a) return { ok: false, reason: 'unknown-auction', price: 0, version: 0 }
    const refuse = (reason: 'too-low' | 'outbid' | 'closed'): BidAck => ({
      ok: false,
      reason,
      price: a.price,
      version: a.version,
    })
    if (a.status === 'closed' || Date.now() >= a.endsAt) {
      this.close(a.productId)
      return refuse('closed')
    }
    // Version périmée : quelqu'un a pris la main depuis que le client a vu l'état.
    if (payload.expectedVersion !== undefined && payload.expectedVersion !== a.version) return refuse('outbid')
    const { amount, bidder } = payload
    if (typeof amount !== 'number' || !Number.isFinite(amount) || typeof bidder !== 'string' || !bidder.trim()) {
      return refuse('too-low')
    }
    // Strictement supérieur au prix courant ET au moins un pas au-dessus.
    if (amount <= a.price || round2(amount) < round2(a.price + minStep)) return refuse('too-low')

    a.price = round2(amount)
    a.version += 1
    a.leader = bidder.trim()
    this.#listeners.onBid({ productId: a.productId, price: a.price, version: a.version, bidder: a.leader, at: Date.now() })
    return { ok: true, price: a.price, version: a.version }
  }
}
