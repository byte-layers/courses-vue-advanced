import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { useCartStore } from '@/features/cart/cartStore'
import CheckoutPage from './CheckoutPage.vue'

let wrapper: VueWrapper | undefined
beforeEach(() => localStorage.clear())
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

async function mountPage(withCart = true) {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (withCart) useCartStore(pinia).add({ id: 1, title: 'Mug', price: 12.5, thumbnail: 'm.png' }, 2)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  wrapper = mount(CheckoutPage, { global: { plugins: [pinia, vuetify, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

const field = (w: VueWrapper, id: string) => w.get(`[data-testid="${id}"] input`)
async function fillValid(w: VueWrapper) {
  await field(w, 'checkout-fullname').setValue('Emily Johnson')
  await field(w, 'checkout-email').setValue('emily@example.com')
  await field(w, 'checkout-address').setValue('12 rue des Lilas')
  await field(w, 'checkout-postalcode').setValue('31000')
  await field(w, 'checkout-city').setValue('Toulouse')
  await w.get('[data-testid="checkout-terms"] input').setValue(true)
}

describe('CheckoutPage (VeeValidate + zod)', () => {
  it('panier vide : pas de formulaire', async () => {
    const { wrapper } = await mountPage(false)
    expect(wrapper.find('[data-testid="checkout-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout-form"]').exists()).toBe(false)
  })

  it('affiche le total du panier', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.get('[data-testid="checkout-total"]').text()).toMatch(/2 article\(s\), total : 25,00/)
  })

  it('formulaire vide envoyé : un message par champ obligatoire, rien n’est enregistré', async () => {
    const { wrapper, pinia } = await mountPage()
    await wrapper.get('[data-testid="checkout-form"]').trigger('submit')
    // VeeValidate valide le schéma avec un léger différé (anti-rebond) : on attend le résultat.
    await vi.waitFor(() => expect(wrapper.text()).toContain('Indiquez votre nom complet.'))
    const text = wrapper.text()
    expect(text).toContain('Cette adresse e-mail n’est pas valide.')
    expect(text).toContain('Le code postal comporte 5 chiffres.')
    expect(text).toContain('Vous devez accepter les conditions de vente.')
    expect(wrapper.find('[data-testid="checkout-confirmation"]').exists()).toBe(false)
    expect(useCartStore(pinia).items).toHaveLength(1)
  })

  it('un champ invalide est signalé quand on le quitte, pas à la première frappe', async () => {
    const { wrapper } = await mountPage()
    const email = field(wrapper, 'checkout-email')
    await email.setValue('abc')
    await new Promise((resolve) => setTimeout(resolve, 50)) // laisse à une validation éventuelle le temps de se produire
    expect(wrapper.text()).not.toContain('n’est pas valide')
    await email.trigger('blur')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Cette adresse e-mail n’est pas valide.'))
  })

  it('formulaire valide : confirmation affichée et panier vidé', async () => {
    const { wrapper, pinia } = await mountPage()
    await fillValid(wrapper)
    await wrapper.get('[data-testid="checkout-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="checkout-confirmation"]').exists()).toBe(true))
    expect(wrapper.get('[data-testid="checkout-confirmation"]').text()).toMatch(/CMD-[0-9A-F]{8}/)
    expect(useCartStore(pinia).items).toEqual([])
  })
})
