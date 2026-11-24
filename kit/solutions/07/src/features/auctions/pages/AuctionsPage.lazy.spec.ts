import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import vuetify from '@/plugins/vuetify'
import { vCountdown } from '@/directives/countdown'
import { makeAuctionList } from '@/test/auction-fixtures'
import { createFakeSocket } from '@/test/fake-socket'
import { createTestQueryClient } from '@/test/with-setup'
import { auctionSocketKey } from '../auctionSocket'
import AuctionsPage from './AuctionsPage.vue'

// Compte combien de fois le module de la modale est CHARGÉ. Sa fabrique ne s'exécute qu'au premier import :
// avec un import statique dans la page, c'est avant même que la page s'affiche ; avec defineAsyncComponent,
// à la première ouverture seulement.
const loads = vi.hoisted(() => ({ count: 0 }))
vi.mock('../components/AuctionModal.vue', async (importOriginal) => {
  loads.count++
  return importOriginal()
})

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('AuctionsPage : la modale est chargée à la demande', () => {
  const fake = createFakeSocket()
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
  }

  it('le code de la modale n’est pas chargé tant qu’on n’ouvre rien', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    expect(document.querySelectorAll('[data-testid="auction-card"]')).toHaveLength(5)
    expect(loads.count).toBe(0)
  })

  it('il se charge à la première ouverture, puis la modale s’affiche', async () => {
    mountPage()
    fake.simulateConnect()
    fake.serverEmit('auction:list', makeAuctionList())
    await flushPromises()
    expect(loads.count).toBe(0)
    document.querySelector<HTMLElement>('[data-testid="auction-card-open"]')?.click()
    await vi.waitFor(() => expect(document.querySelector('[data-testid="auction-modal"]')).not.toBeNull())
    expect(loads.count).toBe(1)
  })
})
