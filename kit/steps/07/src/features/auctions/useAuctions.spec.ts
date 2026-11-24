import { describe, expect, it } from 'vitest'
import { isReactive, nextTick } from 'vue'
import { makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { withSetup } from '@/test/with-setup'
import { auctionKeys } from './queryKeys'
import { useAuctions, useBidHistory } from './useAuctions'

describe('useAuctions : des données en lecture seule', () => {
  it('la liste n’est PAS profondément réactive (shallow) : ni le tableau ni les enchères ne sont des Proxy', async () => {
    const { result, queryClient, unmount } = withSetup(() => useAuctions())
    queryClient.setQueryData(auctionKeys.list(), makeAuctionList())
    await nextTick()
    expect(result.auctions.value).toHaveLength(5)
    expect(isReactive(result.auctions.value)).toBe(false)
    expect(isReactive(result.auctions.value?.[0])).toBe(false)
    unmount()
  })

  it('elle reste mise à jour : remplacer l’enchère dans le cache met la valeur à jour', async () => {
    const { result, queryClient, unmount } = withSetup(() => useAuctions())
    queryClient.setQueryData(auctionKeys.list(), makeAuctionList())
    await nextTick()
    expect(isReactive(result.auctions.value)).toBe(false)
    queryClient.setQueryData(auctionKeys.list(), makeAuctionList().map((a) => ({ ...a, price: a.price + 5 })))
    await nextTick()
    expect(result.auctions.value?.[0]?.price).toBe(455)
    unmount()
  })

  it('l’historique des offres est lui aussi en lecture seule', async () => {
    const { result, queryClient, unmount } = withSetup(() => useBidHistory(123))
    queryClient.setQueryData(auctionKeys.bids(123), [makeBid({ version: 1 }), makeBid({ version: 2 })])
    await nextTick()
    expect(result.value).toHaveLength(2)
    expect(isReactive(result.value)).toBe(false)
    expect(isReactive(result.value[0])).toBe(false)
    unmount()
  })
})
