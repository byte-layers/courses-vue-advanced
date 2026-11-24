import { describe, expect, it } from 'vitest'
import { makeAuction, makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { applyBid, applyClosed, applyState, HISTORY_LIMIT, pushBid } from './auctionCache'

describe('applyBid', () => {
  it('met à jour prix, version et meneur de la bonne enchère, sans toucher aux autres', () => {
    const list = makeAuctionList()
    const next = applyBid(list, makeBid({ productId: 78, price: 905, version: 1, bidder: 'bruno-bot' }))
    expect(next).not.toBe(list)
    expect(next?.find((a) => a.productId === 78)).toMatchObject({
      price: 905,
      version: 1,
      leader: 'bruno-bot',
    })
    // les autres enchères gardent la MÊME référence : pas de rendu inutile
    expect(next?.find((a) => a.productId === 123)).toBe(list.find((a) => a.productId === 123))
  })

  it('ne modifie pas le tableau d’origine', () => {
    const list = makeAuctionList()
    const before = structuredClone(list)
    applyBid(list, makeBid())
    expect(list).toEqual(before)
  })

  it('ignore une offre déjà connue ou plus ancienne (même tableau en retour)', () => {
    const list = [makeAuction({ version: 3, price: 470, leader: 'moi' })]
    expect(applyBid(list, makeBid({ version: 3, price: 470, bidder: 'autre' }))).toBe(list)
    expect(applyBid(list, makeBid({ version: 2, price: 465, bidder: 'autre' }))).toBe(list)
  })

  it('ignore une enchère inconnue, et un cache encore vide', () => {
    const list = makeAuctionList()
    expect(applyBid(list, makeBid({ productId: 999 }))).toBe(list)
    expect(applyBid(undefined, makeBid())).toBeUndefined()
  })
})

describe('applyState', () => {
  it('remplace l’état d’une enchère connue', () => {
    const list = makeAuctionList()
    const state = makeAuction({ productId: 94, price: 640, version: 4, leader: 'chloe-bot' })
    expect(applyState(list, state)?.find((a) => a.productId === 94)).toEqual(state)
  })

  it('ajoute une enchère inconnue, et crée la liste si le cache est vide', () => {
    const state = makeAuction({ productId: 7 })
    expect(applyState(undefined, state)).toEqual([state])
    expect(applyState([makeAuction()], state)).toHaveLength(2)
  })

  it('ignore un état plus ancien que celui qu’on connaît (réponse en retard)', () => {
    const list = [makeAuction({ version: 5, price: 475 })]
    expect(applyState(list, makeAuction({ version: 2, price: 460 }))).toBe(list)
  })
})

describe('applyClosed', () => {
  it('ferme l’enchère, même si la version affichée est plus récente', () => {
    const list = [makeAuction({ version: 5, price: 475 })]
    const closed = makeAuction({ version: 4, price: 470, status: 'closed' })
    expect(applyClosed(list, closed)).toEqual([closed])
  })
})

describe('pushBid', () => {
  it('place la dernière offre en tête', () => {
    const first = makeBid({ version: 1 })
    const second = makeBid({ version: 2, price: 460 })
    expect(pushBid(pushBid(undefined, first), second)).toEqual([second, first])
  })

  it('ne duplique pas une offre déjà reçue', () => {
    const history = [makeBid({ version: 1 })]
    expect(pushBid(history, makeBid({ version: 1 }))).toBe(history)
  })

  it(`garde au plus ${HISTORY_LIMIT} offres, les plus récentes`, () => {
    let history = undefined as ReturnType<typeof pushBid> | undefined
    for (let v = 1; v <= HISTORY_LIMIT + 5; v++) history = pushBid(history, makeBid({ version: v }))
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history?.[0]?.version).toBe(HISTORY_LIMIT + 5)
  })
})
