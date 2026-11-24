import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAuctionList } from '@/test/auction-fixtures'
import { createFakeSocket, type FakeSocket } from '@/test/fake-socket'
import { withSetup } from '@/test/with-setup'
import type { AuctionState, BidAck, BidPayload } from '@/shared/events'
import { auctionKeys } from './queryKeys'
import { BidRefusedError, useBid } from './useBid'

let fake: FakeSocket
beforeEach(() => {
  fake = createFakeSocket()
})

const bid = (amount: number, extra: Partial<BidPayload> = {}): BidPayload => ({
  productId: 123,
  amount,
  bidder: 'moi',
  expectedVersion: 0,
  ...extra,
})

function setup() {
  const mounted = withSetup(() => useBid(fake.socket))
  mounted.queryClient.setQueryData(auctionKeys.list(), makeAuctionList())
  const iphone = () =>
    mounted.queryClient
      .getQueryData<AuctionState[]>(auctionKeys.list())
      ?.find((a) => a.productId === 123)
  return { ...mounted, iphone }
}

/** Ramène l'apostrophe typographique (’) à l'apostrophe droite avant de comparer deux messages. */
const plain = (text: string) => text.replace(/[\u2018\u2019]/g, "'")
const refused = (reason: 'too-low' | 'outbid' | 'closed', price = 450, version = 0): BidAck => ({
  ok: false,
  reason,
  price,
  version,
})

describe('useBid : enchère optimiste', () => {
  it('envoie l’offre avec expectedVersion et affiche le nouveau prix AVANT la réponse', async () => {
    const { result, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    expect(fake.last('auction:bid').args[0]).toEqual({
      productId: 123,
      amount: 500,
      bidder: 'moi',
      expectedVersion: 0,
    })
    // pas de réponse du serveur pour l'instant, et pourtant :
    expect(iphone()).toMatchObject({ price: 500, leader: 'moi', version: 0 })
    expect(result.isPending.value).toBe(true)
    unmount()
  })

  it('offre acceptée : le prix reste, la version vient de l’événement du serveur', async () => {
    const { result, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    fake.last('auction:bid').ack?.({ ok: true, price: 500, version: 1 } satisfies BidAck)
    await vi.waitFor(() => expect(result.isSuccess.value).toBe(true))
    expect(iphone()).toMatchObject({ price: 500, leader: 'moi' })
    unmount()
  })

  it.each(['too-low', 'closed'] as const)('refus « %s » : retour à l’état d’avant', async (reason) => {
    const { result, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    fake.last('auction:bid').ack?.(refused(reason))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(iphone()).toMatchObject({ price: 450, leader: null, version: 0 })
    const error = result.error.value
    expect(error).toBeInstanceOf(BidRefusedError)
    expect((error as BidRefusedError).reason).toBe(reason)
    unmount()
  })

  it('refus « outbid » sans autre événement : retour à l’état d’avant', async () => {
    const { result, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    fake.last('auction:bid').ack?.(refused('outbid', 450, 1))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(iphone()).toMatchObject({ price: 450, leader: null })
    unmount()
  })

  it('refus « outbid » : on garde l’état de l’autre enchérisseur, on ne recule pas', async () => {
    const { result, queryClient, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    // l'offre de l'autre est arrivée AVANT le refus (le serveur traite dans l'ordre)
    queryClient.setQueryData<AuctionState[]>(auctionKeys.list(), (list) =>
      list?.map((a) =>
        a.productId === 123 ? { ...a, price: 480, version: 1, leader: 'alice-bot' } : a,
      ),
    )
    fake.last('auction:bid').ack?.(refused('outbid', 480, 1))
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(iphone()).toMatchObject({ price: 480, version: 1, leader: 'alice-bot' })
    unmount()
  })

  it('réponse qui n’arrive pas : annulation au délai dépassé', async () => {
    const { result, iphone, unmount } = setup()
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    fake.last('auction:bid').timeout?.()
    await vi.waitFor(() => expect(result.isError.value).toBe(true))
    expect(result.error.value).not.toBeInstanceOf(BidRefusedError)
    // apostrophe droite ou typographique (’) : les deux sont acceptés
    expect(plain(result.error.value?.message ?? '')).toBe('Le serveur n\'a pas répondu à temps.')
    expect(iphone()).toMatchObject({ price: 450, leader: null })
    unmount()
  })

  it('ne touche pas aux autres enchères', async () => {
    const { result, queryClient, unmount } = setup()
    const before = queryClient.getQueryData<AuctionState[]>(auctionKeys.list())?.find((a) => a.productId === 78)
    result.mutate(bid(500))
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    const after = queryClient.getQueryData<AuctionState[]>(auctionKeys.list())?.find((a) => a.productId === 78)
    expect(after).toBe(before)
    unmount()
  })
})

describe('sans socket', () => {
  it('échoue avec un message clair', () => {
    expect(() => withSetup(() => useBid())).toThrow(/useAuctionSocket/)
  })
})
