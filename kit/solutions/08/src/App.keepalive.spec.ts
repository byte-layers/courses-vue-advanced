import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { createNotify } from '@/plugins/notify'
import ProductListPage from '@/features/products/pages/ProductListPage.vue'
import { useMockServer } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/with-setup'
import App from './App.vue'

useMockServer()

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const Elsewhere = defineComponent({ render: () => h('p', 'ailleurs') })
const page = (name: string) => defineComponent({ name, render: () => h('p', name) })

async function mountApp() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'home', component: Elsewhere },
      { path: '/products', name: 'products', component: ProductListPage },
      { path: '/products/:id', name: 'product', component: Elsewhere },
      { path: '/auctions', name: 'auctions', component: Elsewhere },
      ...['/cart', '/about', '/login', '/account'].map((path) => ({ path, name: path.slice(1), component: page(path) })),
    ],
  })
  await router.push('/products')
  wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient: createTestQueryClient() }], vuetify, createNotify(), router],
    },
  })
  await flushPromises()
  return router
}

const firstTitle = () => document.querySelector('[data-testid="product-card-title"]')?.textContent
const searchInput = () => document.querySelector<HTMLInputElement>('[data-testid="product-search"] input')!

async function goTo(router: Awaited<ReturnType<typeof mountApp>>, path: string) {
  await router.push(path)
  await flushPromises()
}

describe('KeepAlive sur le catalogue', () => {
  it('la page choisie est conservée quand on va sur /auctions et qu’on revient', async () => {
    const router = await mountApp()
    await vi.waitFor(() => expect(firstTitle()).toBe('Produit 1'))
    document.querySelector<HTMLElement>('[data-testid="product-pagination"] [aria-label="Aller à la page 2"]')?.click()
    await vi.waitFor(() => expect(firstTitle()).toBe('Produit 13'))

    await goTo(router, '/auctions')
    expect(document.querySelector('[data-testid="product-card"]')).toBeNull() // le catalogue est masqué
    await goTo(router, '/products')
    expect(firstTitle()).toBe('Produit 13') // page 2 : pas de retour à la page 1
  })

  it('la recherche saisie est conservée, elle aussi', async () => {
    const router = await mountApp()
    await vi.waitFor(() => expect(firstTitle()).toBe('Produit 1'))
    const input = searchInput()
    input.value = 'Produit 2'
    input.dispatchEvent(new Event('input'))
    await vi.waitFor(() => expect(firstTitle()).toBe('Produit 2'))

    await goTo(router, '/auctions')
    await goTo(router, '/products')
    expect(searchInput().value).toBe('Produit 2')
    expect(firstTitle()).toBe('Produit 2')
  })
})
