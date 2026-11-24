import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TransitionGroup } from 'vue'
import vuetify from '@/plugins/vuetify'
import { makeBid } from '@/test/auction-fixtures'
import BidHistory from './BidHistory.vue'

const bids = [
  makeBid({ version: 3, price: 465, bidder: 'chloe-bot' }),
  makeBid({ version: 2, price: 460, bidder: 'bruno-bot' }),
  makeBid({ version: 1, price: 455, bidder: 'alice-bot' }),
]
// `TransitionGroup: false` : on garde le VRAI TransitionGroup (Vue Test Utils le remplace par un faux par défaut).
const mountHistory = (list = bids) =>
  mount(BidHistory, {
    props: { bids: list },
    global: { plugins: [vuetify], stubs: { TransitionGroup: false } },
  })

describe('BidHistory', () => {
  it('liste les offres dans l’ordre reçu, la plus récente en premier', () => {
    const rows = mountHistory().findAll('[data-testid="bid-row"]')
    expect(rows.map((r) => r.text())).toEqual([
      expect.stringContaining('chloe-bot'),
      expect.stringContaining('bruno-bot'),
      expect.stringContaining('alice-bot'),
    ])
  })

  it('la première ligne seule est marquée « en tête »', () => {
    const rows = mountHistory().findAll('[data-testid="bid-row"]')
    expect(rows[0]!.find('[data-testid="bid-row-leading"]').exists()).toBe(true)
    expect(rows[1]!.find('[data-testid="bid-row-leading"]').exists()).toBe(false)
  })

  it('utilise un TransitionGroup qui rend une <ul> et nomme sa transition « bid »', () => {
    const wrapper = mountHistory()
    const group = wrapper.findComponent(TransitionGroup)
    expect(group.exists()).toBe(true)
    expect(group.props('tag')).toBe('ul')
    expect(group.props('name')).toBe('bid')
    expect(wrapper.find('ul[data-testid="bid-history"]').exists()).toBe(true)
  })

  it('une nouvelle offre s’ajoute en tête sans recréer les lignes existantes (clé = version)', async () => {
    const wrapper = mountHistory()
    const before = wrapper.findAll('[data-testid="bid-row"]').map((r) => r.element)
    await wrapper.setProps({
      bids: [makeBid({ version: 4, price: 470, bidder: 'dev-bot' }), ...bids],
    })
    const after = wrapper.findAll('[data-testid="bid-row"]').map((r) => r.element)
    expect(after).toHaveLength(4)
    expect(after.slice(1)).toEqual(before) // les trois anciennes lignes sont les MÊMES éléments
  })

  it('historique vide : un message, pas de liste', () => {
    const wrapper = mountHistory([])
    expect(wrapper.find('[data-testid="bid-history-empty"]').exists()).toBe(true)
    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
