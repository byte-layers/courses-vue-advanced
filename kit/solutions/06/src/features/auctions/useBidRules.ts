import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AuctionState } from '@/shared/events'
import { formatMoney } from '@/lib/money'

/** Pas minimal entre deux offres, en euros : le même que `BID_STEP` côté serveur. */
export const BID_STEP = 5

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Les règles d'une offre, calculées côté client pour prévenir l'utilisateur AVANT d'envoyer.
 * Le serveur reste juge : il peut refuser une offre que le client croyait valable.
 */
export function useBidRules(auction: MaybeRefOrGetter<AuctionState | undefined>) {
  /** Offre minimale acceptable : prix courant + un pas. */
  const minimum = computed(() => {
    const current = toValue(auction)
    return current ? round2(current.price + BID_STEP) : BID_STEP
  })

  /** Message d'erreur pour ce montant, ou `null` s'il est acceptable. */
  function validate(amount: number): string | null {
    const current = toValue(auction)
    if (!current) return 'Enchère introuvable.'
    if (current.status === 'closed') return 'Cette enchère est terminée.'
    if (!Number.isFinite(amount)) return 'Saisissez un montant.'
    if (round2(amount) < minimum.value) return `Offre minimale : ${formatMoney(minimum.value)}.`
    return null
  }

  return { minimum, validate }
}
