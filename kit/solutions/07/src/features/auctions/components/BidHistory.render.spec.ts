import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import { getRenderCounts, resetRenderCounts } from '@/lib/render-stats'
import { makeBid } from '@/test/auction-fixtures'
import type { BidEvent } from '@/shared/events'
import BidHistory from './BidHistory.vue'

// MESURE : combien de rendus de composants coûtent 50 offres qui arrivent ? (le ticker rapide en envoie 10 par seconde)
const EVENTS = 50
const total = () => Object.values(getRenderCounts()).reduce((sum, n) => sum + n, 0)

beforeEach(() => resetRenderCounts())

async function playTicker() {
  let bids: BidEvent[] = Array.from({ length: 20 }, (_, i) =>
    makeBid({ version: 20 - i, price: 450 + (20 - i) * 0.01, bidder: 'alice-bot' }),
  )
  // le VRAI TransitionGroup (Vue Test Utils le remplace par un faux par défaut) : c'est lui qui coûte
  const wrapper = mount(BidHistory, {
    props: { bids },
    global: { plugins: [vuetify], stubs: { TransitionGroup: false } },
  })
  resetRenderCounts() // on ne compte que ce que coûtent les 50 offres, pas l'affichage initial
  for (let version = 21; version < 21 + EVENTS; version++) {
    bids = [makeBid({ version, price: 450 + version * 0.01, bidder: 'bruno-bot' }), ...bids].slice(0, 20)
    await wrapper.setProps({ bids })
  }
  return wrapper
}

describe('BidHistory : le coût d’un flux d’offres', () => {
  it(`${EVENTS} offres coûtent au plus 2 rendus de composant par offre (tous composants confondus)`, async () => {
    await playTicker()
    console.info('rendus pour', EVENTS, 'offres :', getRenderCounts())
    expect(total()).toBeLessThanOrEqual(EVENTS * 2)
  })

  it('et l’affichage reste exact : la dernière offre en tête, une seule ligne « en tête »', async () => {
    const wrapper = await playTicker()
    expect(total()).toBeLessThanOrEqual(EVENTS * 2)
    const rows = wrapper.findAll('[data-testid="bid-row"]')
    expect(rows[0]!.text()).toContain('bruno-bot')
    expect(wrapper.findAll('[data-testid="bid-row-leading"]')).toHaveLength(1)
    expect(rows[0]!.find('[data-testid="bid-row-leading"]').exists()).toBe(true)
  })
})
