/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { Component } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { FakeSocket } from './fake-socket'

export interface MountWithAppOptions {
  /** Route de départ du routeur (en mémoire). `/home` par défaut. */
  route?: string
  props?: Record<string, unknown>
  /** État initial des stores, par identifiant : `{ cart: { items: [...] }, auth: { session: {...} } }`. */
  initialState?: Record<string, unknown>
  /** `true` (défaut) : les actions des stores sont des espions qui ne font rien ; `false` : les vraies actions. */
  stubActions?: boolean
  /** Un faux socket déjà créé (pour le piloter depuis le test). */
  socket?: FakeSocket
}

/**
 * TODO — Le helper que tous vos tests de composants vont utiliser.
 * Il monte `component` dans une application de test COMPLÈTE et rend de quoi l'inspecter :
 * `{ wrapper, router, pinia, queryClient, socket, notify, unmount }`.
 *
 *  - Pinia : `createTestingPinia({ createSpy: vi.fn, stubActions: options.stubActions ?? true, initialState: options.initialState })`
 *    (de `@pinia/testing`) ;
 *  - TanStack Query : `[VueQueryPlugin, { queryClient }]` avec `createTestQueryClient()` (`./with-setup`) ;
 *  - Vuetify : le plugin de `@/plugins/vuetify`, installé comme plugin GLOBAL du montage (`global.plugins`) ;
 *  - le plugin de notifications `createNotify()` et la directive `countdown` (`global.directives`) ;
 *  - le VRAI routeur : `createAppRouter(createMemoryHistory())` (de `@/router`), puis
 *    `await router.push(options.route ?? '/home')` et `await router.isReady()` AVANT de monter ;
 *  - le faux socket : `options.socket ?? createFakeSocket()`, fourni par `provide` avec la clé `auctionSocketKey` ;
 *  - `mount(component, { attachTo: document.body, props, global: { plugins, directives, provide } })`,
 *    puis `await flushPromises()` ; `unmount: () => wrapper.unmount()`.
 */
export async function mountWithApp(
  component: Component,
  options: MountWithAppOptions = {},
): Promise<{
  wrapper: VueWrapper
  router: ReturnType<typeof import('@/router').createAppRouter>
  pinia: ReturnType<typeof import('@pinia/testing').createTestingPinia>
  queryClient: import('@tanstack/vue-query').QueryClient
  socket: FakeSocket
  notify: ReturnType<typeof import('@/plugins/notify').createNotify>
  unmount: () => void
}> {
  throw new Error('À écrire')
}
