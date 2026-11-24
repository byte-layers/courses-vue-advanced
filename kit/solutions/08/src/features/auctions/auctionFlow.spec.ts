import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { makeAuction, makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { mountWithApp } from '@/test/mount-component'
import AuctionsPage from './pages/AuctionsPage.vue'

// Parcours complet « enchère -> outbid -> rollback » : la page, la modale, le cache, le store et le faux socket ensemble.
// Le serveur est joué par le test : `socket.serverEmit(...)` pour les événements, `ack(...)` pour la réponse à une offre.
let cleanup: (() => void) | undefined
afterEach(() => {
  cleanup?.()
  cleanup = undefined
  document.body.innerHTML = ''
})

const byId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const text = (id: string) => byId(id)?.textContent?.replace(/\s+/g, ' ').trim()

/** Page des enchères montée, liste reçue, modale de l'iPhone ouverte. */
async function openIphone() {
  const mounted = await mountWithApp(AuctionsPage, { route: '/auctions', stubActions: false })
  cleanup = mounted.unmount
  const { socket } = mounted
  socket.simulateConnect()
  socket.serverEmit('auction:list', makeAuctionList())
  await flushPromises()
  byId('auction-card-open')?.click()
  await vi.waitFor(() => expect(byId('auction-modal')).not.toBeNull())
  return mounted
}

/** Tape un montant dans le champ de la modale et envoie l'offre. */
async function bid(amount: number, socket: Awaited<ReturnType<typeof openIphone>>['socket']) {
  const input = byId('auction-modal-amount')!.querySelector('input') as HTMLInputElement
  input.value = String(amount)
  input.dispatchEvent(new Event('input'))
  await flushPromises()
  byId('auction-modal-submit')?.click()
  await vi.waitFor(() => expect(socket.emittedOf('auction:bid')).toHaveLength(1))
}

describe('parcours enchère', () => {
  it('l’offre part avec la version vue, et le prix monte avant la réponse du serveur', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    expect(socket.last('auction:bid').args[0]).toEqual({
      productId: 123,
      amount: 500,
      bidder: 'invité',
      expectedVersion: 0,
    })
    expect(text('auction-modal-price')).toMatch(/500,00/)
    expect(text('auction-modal-leader')).toContain('invité')
  })

  it('offre acceptée : le prix reste et l’historique affiche l’offre confirmée', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    socket.last('auction:bid').ack?.({ ok: true, price: 500, version: 1 })
    socket.serverEmit('auction:bid', makeBid({ price: 500, version: 1, bidder: 'invité' }))
    await flushPromises()
    expect(text('auction-modal-price')).toMatch(/500,00/)
    expect(text('bid-history')).toContain('invité')
    expect(byId('auction-modal-error')).toBeNull()
  })

  it('refus « too-low » : rollback du prix, message d’erreur', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    socket.last('auction:bid').ack?.({ ok: false, reason: 'too-low', price: 450, version: 0 })
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(text('auction-modal-price')).toMatch(/450,00/)
    expect(text('auction-modal-leader')).toContain('Aucune offre')
    expect(text('auction-modal-error')).toContain('trop basse')
  })

  it('outbid : l’offre de l’autre arrive d’abord, le refus ne la fait pas reculer', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    // pendant que mon offre est en vol, quelqu'un d'autre passe à 480 (le serveur traite dans l'ordre)
    socket.serverEmit('auction:bid', makeBid({ price: 480, version: 1, bidder: 'bruno-bot' }))
    socket.last('auction:bid').ack?.({ ok: false, reason: 'outbid', price: 480, version: 1 })
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(text('auction-modal-error')).toContain('avant vous')
    expect(text('auction-modal-price')).toMatch(/480,00/) // pas 450 (rollback aveugle), pas 500 (optimiste)
    expect(text('auction-modal-leader')).toContain('bruno-bot')
    expect(text('bid-history')).toContain('bruno-bot')
  })

  it('une surenchère après ma prise de tête est annoncée aux lecteurs d’écran', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    socket.last('auction:bid').ack?.({ ok: true, price: 500, version: 1 })
    socket.serverEmit('auction:bid', makeBid({ price: 500, version: 1, bidder: 'invité' }))
    await flushPromises()
    expect(text('auction-modal-live')).toBe('')
    socket.serverEmit('auction:bid', makeBid({ price: 510, version: 2, bidder: 'chloe-bot' }))
    await flushPromises()
    expect(byId('auction-modal-live')?.getAttribute('aria-live')).toBe('polite')
    expect(text('auction-modal-live')).toMatch(/Vous êtes surenchéri : chloe-bot a offert 510,00/)
  })

  it('délai dépassé (le serveur ne répond pas) : retour à l’état d’avant, message', async () => {
    const { socket } = await openIphone()
    await bid(500, socket)
    socket.last('auction:bid').timeout?.()
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(text('auction-modal-error')).toContain('pas répondu')
    expect(text('auction-modal-price')).toMatch(/450,00/)
  })

  it('perte de connexion : bandeau ; reconnexion : les enchères sont rejointes à nouveau et le prix rattrapé', async () => {
    const { socket } = await openIphone()
    socket.emitted.length = 0

    socket.simulateDisconnect()
    await flushPromises()
    expect(byId('auctions-offline')).not.toBeNull()

    socket.simulateConnect()
    await flushPromises()
    expect(byId('auctions-offline')).toBeNull()
    const joins = socket.emittedOf('auction:join')
    expect(joins.map((e) => e.args[0])).toEqual([123, 78, 94, 101, 174])
    // pendant la coupure l'iPhone est monté à 620 : la réponse du join le dit
    joins[0]!.ack?.(makeAuction({ productId: 123, price: 620, version: 7, leader: 'alice-bot' }))
    await flushPromises()
    expect(text('auction-modal-price')).toMatch(/620,00/)
    expect(text('auction-modal-leader')).toContain('alice-bot')
  })

  it('enchère terminée par le serveur : la modale ne propose plus d’offre', async () => {
    const { socket } = await openIphone()
    expect(byId('auction-modal-submit')).not.toBeNull()
    socket.serverEmit('auction:closed', makeAuction({ price: 450, version: 0, status: 'closed' }))
    await flushPromises()
    expect(byId('auction-modal-closed')).not.toBeNull()
    expect(byId('auction-modal-submit')).toBeNull()
  })
})
