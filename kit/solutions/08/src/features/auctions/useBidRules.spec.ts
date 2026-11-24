import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { withSetup } from '@/test/with-setup'
import { makeAuction } from '@/test/auction-fixtures'
import type { AuctionState } from '@/shared/events'
import { BID_STEP, useBidRules } from './useBidRules'

// Tests d'un composable avec withSetup : il tourne dans un vrai composant (inject, cycle de vie...).
function setup(initial: AuctionState | undefined) {
  const auction = ref<AuctionState | undefined>(initial)
  const mounted = withSetup(() => useBidRules(auction))
  return { auction, ...mounted }
}

describe('useBidRules', () => {
  it('l’offre minimale est le prix courant plus un pas', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.minimum.value).toBe(450 + BID_STEP)
    unmount()
  })

  it('le minimum suit le prix quand il change (réactif)', async () => {
    const { result, auction, unmount } = setup(makeAuction({ price: 450 }))
    auction.value = makeAuction({ price: 480.5 })
    await nextTick()
    expect(result.minimum.value).toBe(485.5)
    unmount()
  })

  it('arrondit à deux décimales (pas de 480.5 + 5 = 485.50000000000006)', () => {
    const { result, unmount } = setup(makeAuction({ price: 450.07 }))
    expect(result.minimum.value).toBe(455.07)
    unmount()
  })

  it('accepte le minimum exact et tout montant au-dessus', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.validate(455)).toBeNull()
    expect(result.validate(1000)).toBeNull()
    unmount()
  })

  it('refuse un montant sous le minimum, avec le minimum dans le message', () => {
    const { result, unmount } = setup(makeAuction({ price: 450 }))
    expect(result.validate(454.99)).toMatch(/Offre minimale : 455,00/)
    expect(result.validate(450)).not.toBeNull()
    unmount()
  })

  it('refuse un montant qui n’est pas un nombre', () => {
    const { result, unmount } = setup(makeAuction())
    expect(result.validate(Number.NaN)).toBe('Saisissez un montant.')
    expect(result.validate(Number.POSITIVE_INFINITY)).toBe('Saisissez un montant.')
    unmount()
  })

  it('enchère terminée : aucune offre n’est acceptable', () => {
    const { result, unmount } = setup(makeAuction({ status: 'closed' }))
    expect(result.validate(10_000)).toBe('Cette enchère est terminée.')
    unmount()
  })

  it('enchère absente : message dédié, minimum de repli', () => {
    const { result, unmount } = setup(undefined)
    expect(result.validate(500)).toBe('Enchère introuvable.')
    expect(result.minimum.value).toBe(BID_STEP)
    unmount()
  })
})
