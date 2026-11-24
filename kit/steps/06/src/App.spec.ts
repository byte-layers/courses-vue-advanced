import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { createNotify } from '@/plugins/notify'
import App from './App.vue'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const Fine = defineComponent({ render: () => h('p', { 'data-testid': 'fine-page' }, 'page saine') })
const Broken = defineComponent({
  setup() {
    throw new Error('page cassée')
  },
})

async function mountApp() {
  document.getElementById('modals')?.remove() // celle de test/setup.ts : on veut CELLE de App.vue
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Fine },
      { path: '/boom', name: 'boom', component: Broken },
      { path: '/products', name: 'products', component: Fine },
      { path: '/cart', name: 'cart', component: Fine },
      { path: '/about', name: 'about', component: Fine },
      { path: '/auctions', name: 'auctions', component: Fine },
      { path: '/login', name: 'login', component: Fine },
      { path: '/account', name: 'account', component: Fine },
    ],
  })
  await router.push('/')
  wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [pinia, vuetify, createNotify(), router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('App (coque)', () => {
  it('fournit la cible #modals DANS l’application Vuetify (pour garder le thème)', async () => {
    await mountApp()
    const target = document.getElementById('modals')
    expect(target).not.toBeNull()
    expect(target?.closest('.v-application')).not.toBeNull()
  })

  it('une page qui plante est remplacée par un message, l’en-tête reste', async () => {
    const { router } = await mountApp()
    await router.push('/boom')
    await flushPromises()
    expect(document.querySelector('[data-testid="error-boundary"]')?.textContent).toContain('page cassée')
    expect(document.querySelector('[data-testid="header"]')).not.toBeNull()
  })

  it('changer de page réarme la frontière', async () => {
    const { router } = await mountApp()
    await router.push('/boom')
    await flushPromises()
    await router.push('/products')
    await flushPromises()
    expect(document.querySelector('[data-testid="error-boundary"]')).toBeNull()
    expect(document.querySelector('[data-testid="fine-page"]')).not.toBeNull()
  })
})
