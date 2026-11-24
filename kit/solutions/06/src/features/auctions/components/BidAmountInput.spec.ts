import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import BidAmountInput from './BidAmountInput.vue'

function mountInput(modelValue: number, props: { min?: number; step?: number } = {}) {
  return mount(BidAmountInput, {
    props: { modelValue, 'onUpdate:modelValue': () => undefined, ...props },
    global: { plugins: [vuetify] },
  })
}
const lastUpdate = (wrapper: ReturnType<typeof mountInput>) =>
  wrapper.emitted<[number]>('update:modelValue')?.at(-1)?.[0]

describe('BidAmountInput (defineModel)', () => {
  it('affiche la valeur du v-model dans le champ', () => {
    const wrapper = mountInput(455)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('455')
  })

  it('+ ajoute un pas, − en retire un : le parent reçoit update:modelValue', async () => {
    const wrapper = mountInput(455, { step: 5 })
    await wrapper.get('[data-testid="bid-amount-increase"]').trigger('click')
    expect(lastUpdate(wrapper)).toBe(460)
    await wrapper.get('[data-testid="bid-amount-decrease"]').trigger('click')
    expect(lastUpdate(wrapper)).toBe(450)
  })

  it('le pas par défaut est de 5', async () => {
    const wrapper = mountInput(100)
    await wrapper.get('[data-testid="bid-amount-increase"]').trigger('click')
    expect(lastUpdate(wrapper)).toBe(105)
  })

  it('− est désactivé quand l’offre atteindrait un montant sous le minimum', () => {
    const wrapper = mountInput(455, { min: 455, step: 5 })
    expect(wrapper.get('[data-testid="bid-amount-decrease"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="bid-amount-increase"]').attributes('disabled')).toBeUndefined()
  })

  it('ce que l’on tape devient un NOMBRE dans le modèle', async () => {
    const wrapper = mountInput(455)
    await wrapper.find('input').setValue('512.5')
    expect(lastUpdate(wrapper)).toBe(512.5)
  })

  it('un champ vidé ou illisible n’écrit jamais NaN dans le modèle', async () => {
    const wrapper = mountInput(455)
    await wrapper.find('input').setValue('')
    await wrapper.find('input').setValue('abc')
    for (const [value] of wrapper.emitted<[number]>('update:modelValue') ?? []) {
      expect(Number.isNaN(value)).toBe(false)
    }
  })

  it('les boutons ont un nom accessible', () => {
    const wrapper = mountInput(455)
    expect(wrapper.get('[data-testid="bid-amount-increase"]').attributes('aria-label')).toBe(
      'Augmenter l’offre',
    )
    expect(wrapper.get('[data-testid="bid-amount-decrease"]').attributes('aria-label')).toBe(
      'Diminuer l’offre',
    )
  })
})
