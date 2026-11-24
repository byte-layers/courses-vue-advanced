import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { makeAuction, makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { createFakeSocket, type FakeSocket } from '@/test/fake-socket'
import { withSetup } from '@/test/with-setup'
import type { AuctionState, BidEvent } from '@/shared/events'
import type { AuctionSocket } from './auctionSocket'
import { useAuctionStore } from './auctionStore'
import { auctionKeys } from './queryKeys'
import { useAuctionSocket } from './useAuctionSocket'

let fake: FakeSocket
beforeEach(() => {
  fake = createFakeSocket()
})
afterEach(() => vi.useRealTimers())

/** Monte le composable avec le faux socket et rend de quoi lire le cache. */
function setup() {
  const mounted = withSetup(() => useAuctionSocket({ socket: fake.socket }))
  const list = () => mounted.queryClient.getQueryData<AuctionState[]>(auctionKeys.list())
  const history = (id: number) => mounted.queryClient.getQueryData<BidEvent[]>(auctionKeys.bids(id))
  return { ...mounted, list, history, store: useAuctionStore(mounted.pinia) }
}

describe('cycle de vie de la connexion', () => {
  it('le socket est typé avec les événements partagés (vérifié par vue-tsc)', () => {
    const { result, unmount } = setup()
    expectTypeOf(result.socket).toEqualTypeOf<AuctionSocket>()
    unmount()
  })

  it('connecte le socket une fois, au montage', () => {
    const { unmount } = setup()
    expect(fake.connectCalls).toBe(1)
    unmount()
  })

  it('au démontage : retire ses écouteurs et ferme la connexion', () => {
    const { unmount } = setup()
    expect(fake.listenerCount()).toBeGreaterThan(0)
    unmount()
    expect(fake.listenerCount()).toBe(0)
    expect(fake.disconnectCalls).toBe(1)
  })

  it('reflète connexion, perte de réseau et erreur dans le store', () => {
    const { store, unmount } = setup()
    expect(store.connected).toBe(false)
    fake.simulateConnect()
    expect(store.connected).toBe(true)
    fake.simulateDisconnect()
    expect(store.connected).toBe(false)
    fake.simulateConnectError()
    expect(store.connectionError).toMatch(/injoignable/)
    fake.simulateConnect()
    expect(store.connectionError).toBeNull()
    unmount()
  })
})

describe('le cache suit les événements du serveur', () => {
  it('auction:list remplit le cache et fait rejoindre chaque enchère', () => {
    const { list, unmount } = setup()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    expect(list()).toHaveLength(5)
    expect(fake.emittedOf('auction:join').map((e) => e.args[0])).toEqual([123, 78, 94, 101, 174])
    unmount()
  })

  it('auction:bid met à jour prix, meneur et historique', () => {
    const { list, history, unmount } = setup()
    fake.serverEmit('auction:list', makeAuctionList())
    fake.serverEmit('auction:bid', makeBid({ price: 455, version: 1, bidder: 'alice-bot' }))
    expect(list()?.find((a) => a.productId === 123)).toMatchObject({
      price: 455,
      version: 1,
      leader: 'alice-bot',
    })
    expect(history(123)).toHaveLength(1)
    fake.serverEmit('auction:bid', makeBid({ price: 460, version: 2, bidder: 'bruno-bot' }))
    expect(history(123)?.map((b) => b.bidder)).toEqual(['bruno-bot', 'alice-bot'])
    unmount()
  })

  it('une offre périmée (version déjà connue) ne fait pas reculer le prix', () => {
    const { list, unmount } = setup()
    fake.serverEmit('auction:list', makeAuctionList())
    fake.serverEmit('auction:bid', makeBid({ price: 460, version: 2, bidder: 'bruno-bot' }))
    fake.serverEmit('auction:bid', makeBid({ price: 455, version: 1, bidder: 'alice-bot' }))
    expect(list()?.[0]).toMatchObject({ price: 460, version: 2, leader: 'bruno-bot' })
    unmount()
  })

  it('auction:state remplace l’état, auction:closed ferme l’enchère', () => {
    const { list, unmount } = setup()
    fake.serverEmit('auction:list', makeAuctionList())
    fake.serverEmit('auction:state', makeAuction({ productId: 78, price: 930, version: 3, leader: 'x' }))
    expect(list()?.find((a) => a.productId === 78)).toMatchObject({ price: 930, leader: 'x' })
    fake.serverEmit('auction:closed', makeAuction({ productId: 78, price: 930, version: 3, status: 'closed' }))
    expect(list()?.find((a) => a.productId === 78)?.status).toBe('closed')
    unmount()
  })

  it('un reset du serveur (versions qui reculent) vide l’historique', () => {
    const { history, unmount } = setup()
    fake.serverEmit('auction:list', makeAuctionList())
    fake.serverEmit('auction:bid', makeBid({ version: 1 }))
    expect(history(123)).toHaveLength(1)
    fake.serverEmit('auction:state', makeAuction({ version: 1, price: 455 }))
    fake.serverEmit('auction:list', makeAuctionList()) // version 0 : le serveur est reparti de zéro
    expect(history(123)).toEqual([])
    unmount()
  })
})

describe('décalage d’horloge', () => {
  it('server:time donne l’écart entre l’horloge du serveur et celle du client', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(10_000)
    const { result, unmount } = setup()
    expect(result.clockOffset.value).toBe(0)
    fake.serverEmit('server:time', 25_000) // le serveur est 15 s « en avance »
    expect(result.clockOffset.value).toBe(15_000)
    vi.setSystemTime(12_000)
    expect(result.serverNow()).toBe(27_000)
    fake.serverEmit('server:time', 12_000 - 3_000) // maintenant 3 s « en retard »
    expect(result.clockOffset.value).toBe(-3_000)
    unmount()
  })
})

describe('reconnexion', () => {
  it('rejoint à nouveau les enchères et reprend l’état à jour', () => {
    const { list, unmount } = setup()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    fake.emitted.length = 0 // on ne regarde que ce qui suit la coupure

    fake.simulateDisconnect()
    fake.simulateConnect() // le réseau revient : le serveur ne se souvient d'aucune room
    const joins = fake.emittedOf('auction:join')
    expect(joins.map((e) => e.args[0])).toEqual([123, 78, 94, 101, 174])

    // pendant la coupure, l'enchère 78 a monté : la réponse du `join` porte l'état à jour
    joins[1]!.ack?.(makeAuction({ productId: 78, price: 950, version: 6, leader: 'chloe-bot' }))
    expect(list()?.find((a) => a.productId === 78)).toMatchObject({ price: 950, version: 6 })
    unmount()
  })

  it('ne rejoint plus une enchère quittée', () => {
    const { result, unmount } = setup()
    fake.simulateConnect()
    result.join(123)
    result.join(78)
    result.leave(78)
    fake.emitted.length = 0
    fake.simulateDisconnect()
    fake.simulateConnect()
    expect(fake.emittedOf('auction:join').map((e) => e.args[0])).toEqual([123])
    unmount()
  })

  it('join demandé avant la connexion : envoyé dès qu’elle est établie', () => {
    const { result, unmount } = setup()
    result.join(123)
    expect(fake.emittedOf('auction:join')).toHaveLength(0)
    fake.simulateConnect()
    expect(fake.emittedOf('auction:join').map((e) => e.args[0])).toEqual([123])
    unmount()
  })
})
