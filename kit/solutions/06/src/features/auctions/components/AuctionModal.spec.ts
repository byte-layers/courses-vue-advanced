import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import vuetify from '@/plugins/vuetify'
import { vCountdown } from '@/directives/countdown'
import { makeAuction, makeAuctionList, makeBid } from '@/test/auction-fixtures'
import { createFakeSocket, type FakeSocket } from '@/test/fake-socket'
import { createTestQueryClient } from '@/test/with-setup'
import { auctionSocketKey } from '../auctionSocket'
import { auctionKeys } from '../queryKeys'
import AuctionModal from './AuctionModal.vue'
import BidAmountInput from './BidAmountInput.vue'
import BidHistory from './BidHistory.vue'

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
})

const inModals = (testid: string) =>
  document.querySelector<HTMLElement>(`#modals [data-testid="${testid}"]`)

function mountModal(
  auction = makeAuction({ version: 2, price: 460, leader: 'alice-bot' }),
  extraProps: Record<string, unknown> = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(auctionKeys.list(), [auction, ...makeAuctionList().slice(1)])
  wrapper = mount(AuctionModal, {
    attachTo: document.body,
    props: { auction, offset: 0, ...extraProps },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }], vuetify],
      directives: { countdown: vCountdown },
      provide: { [auctionSocketKey as symbol]: fake.socket },
    },
  })
  return { wrapper, queryClient }
}

describe('AuctionModal (Teleport)', () => {
  it('son contenu est téléporté dans #modals, pas dans le composant', () => {
    const { wrapper } = mountModal()
    expect(inModals('auction-modal')).not.toBeNull()
    expect(wrapper.find('[data-testid="auction-modal"]').exists()).toBe(false)
    expect(inModals('auction-modal')?.closest('#modals')).not.toBeNull()
  })

  it('est une vraie modale accessible : rôle dialog, aria-modal, titre associé', () => {
    mountModal()
    const dialog = inModals('auction-modal')!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const labelledBy = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(labelledBy)?.textContent).toContain('iPhone 13 Pro')
  })

  it('Échap, le bouton Fermer et un clic sur le fond émettent « close »', async () => {
    const { wrapper } = mountModal()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
    inModals('auction-modal-close')?.click()
    expect(wrapper.emitted('close')).toHaveLength(2)
    inModals('auction-modal-backdrop')?.click()
    expect(wrapper.emitted('close')).toHaveLength(3)
    // un clic DANS la fenêtre ne ferme pas
    inModals('auction-modal-price')?.click()
    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('le focus entre dans la modale à l’ouverture et revient à son point de départ à la fermeture', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { wrapper } = mountModal()
    await flushPromises()
    expect(inModals('auction-modal')?.contains(document.activeElement)).toBe(true)
    wrapper.unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('le retrait de l’écouteur Échap : plus de « close » après le démontage', () => {
    const onClose = vi.fn()
    const { wrapper } = mountModal(undefined, { onClose })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('utilise BidAmountInput en v-model : le champ commence au minimum, « + » ajoute un pas', async () => {
    const { wrapper } = mountModal()
    const input = wrapper.findComponent(BidAmountInput)
    expect(input.exists()).toBe(true)
    const field = inModals('auction-modal-amount')!.querySelector('input') as HTMLInputElement
    expect(field.value).toBe('465') // prix courant 460 + un pas
    inModals('bid-amount-increase')?.click()
    await flushPromises()
    expect(field.value).toBe('470')
  })

  it('affiche l’historique avec BidHistory, mis à jour par le cache', async () => {
    const { wrapper, queryClient } = mountModal()
    expect(wrapper.findComponent(BidHistory).exists()).toBe(true)
    expect(inModals('bid-history-empty')).not.toBeNull()
    queryClient.setQueryData(auctionKeys.bids(123), [makeBid({ version: 3, bidder: 'chloe-bot' })])
    await flushPromises()
    expect(inModals('bid-history')?.textContent).toContain('chloe-bot')
  })

  it('envoie l’offre du champ avec expectedVersion', async () => {
    mountModal()
    inModals('auction-modal-submit')?.click()
    await vi.waitFor(() => expect(fake.emittedOf('auction:bid')).toHaveLength(1))
    expect(fake.last('auction:bid').args[0]).toMatchObject({
      productId: 123,
      amount: 465,
      expectedVersion: 2,
    })
  })

  it('enchère terminée : pas de formulaire', () => {
    mountModal(makeAuction({ status: 'closed', version: 4 }))
    expect(inModals('auction-modal-closed')).not.toBeNull()
    expect(inModals('auction-modal-submit')).toBeNull()
  })
})
