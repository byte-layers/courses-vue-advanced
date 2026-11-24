import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import vuetify from '@/plugins/vuetify'
import { vCountdown } from '@/directives/countdown'
import { makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { createFakeSocket, type FakeSocket } from '@/test/fake-socket'
import { createTestQueryClient } from '@/test/with-setup'
import { auctionSocketKey } from '../auctionSocket'
import AuctionsPage from './AuctionsPage.vue'

let fake: FakeSocket
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fake = createFakeSocket()
  localStorage.clear()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/** La modale est téléportée hors du composant : on la cherche dans tout le document. */
const byId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const allById = (id: string) => [...document.body.querySelectorAll(`[data-testid="${id}"]`)]

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  wrapper = mount(AuctionsPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient: createTestQueryClient() }], vuetify],
      directives: { countdown: vCountdown },
      provide: { [auctionSocketKey as symbol]: fake.socket },
    },
  })
  return wrapper
}

async function openIphone() {
  byId('auction-card-open')?.click()
  // Depuis l'étape 07 la modale est un composant ASYNCHRONE : son code se charge à la première ouverture.
  await vi.waitFor(() => expect(byId('auction-modal')).not.toBeNull())
}

describe('AuctionsPage', () => {
  it('affiche le chargement, puis les cinq enchères reçues du serveur', async () => {
    mountPage()
    expect(byId('auctions-loading')).not.toBeNull()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    expect(byId('auctions-loading')).toBeNull()
    expect(allById('auction-card')).toHaveLength(5)
    expect(byId('auctions-connection')?.textContent).toContain('En direct')
  })

  it('affiche une erreur avec un bouton pour réessayer quand le serveur est injoignable', async () => {
    mountPage()
    fake.simulateConnectError()
    await flushPromises()
    expect(byId('auctions-error')?.textContent).toContain('injoignable')
    const connectCalls = fake.connectCalls
    byId('auctions-retry')?.click()
    expect(fake.connectCalls).toBe(connectCalls + 1)
  })

  it('met le prix à jour quand une offre arrive, sans recharger', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    fake.serverEmit('auction:bid', makeBid({ price: 455, version: 1, bidder: 'alice-bot' }))
    await flushPromises()
    const card = allById('auction-card')[0] as HTMLElement
    expect(card.textContent).toContain('alice-bot')
    expect(card.querySelector('[data-testid="auction-card-price"]')?.textContent).toMatch(/455,00/)
  })

  it('prévient quand la connexion est perdue, puis quand elle revient', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    fake.simulateDisconnect()
    await flushPromises()
    expect(byId('auctions-offline')).not.toBeNull()
    fake.simulateConnect()
    await flushPromises()
    expect(byId('auctions-offline')).toBeNull()
  })

  it('le compte à rebours tient compte du décalage d’horloge du serveur', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(1_000_000)
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('server:time', 1_000_000 + 60_000) // le serveur avance d'une minute
    fake.serverEmit(
      'auction:list',
      makeAuctionList().map((a) => ({ ...a, endsAt: 1_000_000 + 60_000 + 90_000 })),
    )
    await flushPromises()
    // fin = serveur + 90 s : 90 s restantes, quelle que soit l'horloge du client
    expect(byId('auction-card-countdown')?.textContent).toBe('01:30')
  })

  it('enchère : le prix monte tout de suite ; un refus le ramène et affiche pourquoi', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    await openIphone()

    const amount = byId('auction-modal-amount')?.querySelector('input') as HTMLInputElement
    expect(amount.value).toBe('455') // prix courant + un pas
    amount.value = '500'
    amount.dispatchEvent(new Event('input'))
    byId('auction-modal-submit')?.click()
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    expect(byId('auction-modal-price')?.textContent).toMatch(/500,00/) // optimiste

    fake.last('auction:bid').ack?.({ ok: false, reason: 'too-low', price: 450, version: 0 })
    await vi.waitFor(() => expect(byId('auction-modal-error')).not.toBeNull())
    expect(byId('auction-modal-price')?.textContent).toMatch(/450,00/) // rollback
    expect(byId('auction-modal-error')?.textContent).toContain('trop basse')
  })

  it('annonce « vous êtes surenchéri » dans une région aria-live polie', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    await openIphone()
    const live = byId('auction-modal-live') as HTMLElement
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent?.trim()).toBe('')

    // je prends la tête (offre acceptée par le serveur)...
    const store = (await import('../auctionStore')).useAuctionStore()
    fake.serverEmit('auction:bid', makeBid({ price: 460, version: 1, bidder: store.bidder }))
    await flushPromises()
    expect(live.textContent?.trim()).toBe('')
    // ... puis quelqu'un d'autre me dépasse
    fake.serverEmit('auction:bid', makeBid({ price: 470, version: 2, bidder: 'bruno-bot' }))
    await flushPromises()
    expect(live.textContent).toContain('Vous êtes surenchéri')
    expect(live.textContent).toContain('bruno-bot')
  })
})
