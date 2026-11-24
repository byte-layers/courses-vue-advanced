import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { createNotify } from '@/plugins/notify'
import { useMockServer } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/with-setup'
import ProductListPage from './ProductListPage.vue'

useMockServer()

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

async function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', name: 'product', component: { render: () => null } }],
  })
  wrapper = mount(ProductListPage, {
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient: createTestQueryClient() }], vuetify, createNotify(), router],
    },
  })
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 30)) // la réponse de MSW arrive au tour suivant
  await flushPromises()
  return wrapper
}

describe('ProductListPage avec ProductGrid', () => {
  it('affiche les 12 produits de la première page dans la grille générique', async () => {
    const page = await mountPage()
    const grid = page.get('[data-testid="product-list"]')
    expect(grid.findAll('[data-testid="product-grid-cell"]')).toHaveLength(12)
    expect(grid.findAll('[data-testid="product-card"]')).toHaveLength(12)
  })

  it('le slot « item » donne chaque produit à ProductCard (le titre est affiché)', async () => {
    const page = await mountPage()
    expect(page.findAll('[data-testid="product-grid-cell"]')[0]?.text()).toContain('Produit 1')
  })
})
