import { vi } from 'vitest'
import type { Component } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory } from 'vue-router'
import vuetify from '@/plugins/vuetify'
import { createNotify } from '@/plugins/notify'
import { vCountdown } from '@/directives/countdown'
import { createAppRouter } from '@/router'
import { auctionSocketKey } from '@/features/auctions/auctionSocket'
import { createFakeSocket, type FakeSocket } from './fake-socket'
import { createTestQueryClient } from './with-setup'

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
 * Monte un composant dans une application COMPLÈTE de test : Pinia de test, TanStack Query, Vuetify, le plugin
 * de notifications, la directive `v-countdown`, le VRAI routeur (historique en mémoire, vraies routes et garde)
 * et un faux socket fourni par `provide`. Appelez `unmount()` en fin de test.
 */
export async function mountWithApp(component: Component, options: MountWithAppOptions = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: options.stubActions ?? true,
    initialState: options.initialState,
  })
  const queryClient = createTestQueryClient()
  const router = createAppRouter(createMemoryHistory())
  const socket = options.socket ?? createFakeSocket()
  const notify = createNotify()

  await router.push(options.route ?? '/home')
  await router.isReady()

  const wrapper: VueWrapper = mount(component, {
    attachTo: document.body,
    props: options.props,
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }], vuetify, notify, router],
      directives: { countdown: vCountdown },
      provide: { [auctionSocketKey as symbol]: socket.socket },
    },
  })
  await flushPromises()

  return { wrapper, router, pinia, queryClient, socket, notify, unmount: () => wrapper.unmount() }
}
