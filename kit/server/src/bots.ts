// Bots déterministes : même graine => même suite de mises (hors horloge).
import type { AuctionEngine } from './auctions.ts'
import { round2 } from './auctions.ts'
import type { Config } from './config.ts'

/** Générateur pseudo-aléatoire mulberry32 : petit, rapide, reproductible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = ['alice-bot', 'bruno-bot', 'chloe-bot', 'dev-bot']

export class Bots {
  #engine: AuctionEngine
  #cfg: Config
  #rand: () => number
  #timers: ReturnType<typeof setInterval>[] = []

  constructor(engine: AuctionEngine, cfg: Config) {
    this.#engine = engine
    this.#cfg = cfg
    this.#rand = mulberry32(cfg.botSeed)
  }

  /** Un bot enchérit tout de suite (utilisé aussi par POST /control/bot-bid). */
  bidNow(productId: number, amount?: number) {
    const a = this.#engine.auctions.get(productId)
    const bidder = NAMES[Math.floor(this.#rand() * NAMES.length)]
    const price = a?.price ?? 0
    const target = amount ?? round2(price + this.#engine.step * (1 + Math.floor(this.#rand() * 4)))
    return { bidder, ack: this.#engine.bid({ productId, amount: target, bidder }) }
  }

  /** Démarre les bots (mode normal et, si BOT_RATE > 0, ticker rapide). */
  start() {
    if (!this.#cfg.botsEnabled) return
    // Mode normal : une surenchère régulière sur une enchère ouverte tirée au hasard.
    this.#timers.push(
      setInterval(() => {
        const open = this.#engine.list().filter((a) => a.status === 'open')
        if (open.length) this.bidNow(open[Math.floor(this.#rand() * open.length)].productId)
      }, this.#cfg.botIntervalMs).unref(),
    )
    // Ticker rapide : N mises par seconde, de +0,01 €, sur la première enchère (démo de performance).
    if (this.#cfg.botRate > 0) {
      const productId = this.#engine.list()[0].productId
      this.#timers.push(
        setInterval(() => {
          const a = this.#engine.auctions.get(productId)
          if (!a || a.status !== 'open') return
          const bidder = NAMES[Math.floor(this.#rand() * NAMES.length)]
          this.#engine.bid({ productId, amount: round2(a.price + 0.01), bidder }, 0.01)
        }, 1000 / this.#cfg.botRate).unref(),
      )
    }
  }

  stop() {
    this.#timers.forEach(clearInterval)
    this.#timers = []
  }

  /** Après un reset : graine d'origine, mêmes mises qu'au premier lancement. */
  restart() {
    this.#rand = mulberry32(this.#cfg.botSeed)
    this.start()
  }
}
