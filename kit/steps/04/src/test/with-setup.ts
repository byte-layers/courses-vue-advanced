import { createApp, type App, type Plugin } from 'vue'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

/** Un QueryClient de test : pas de nouvelle tentative, pas d'attente inutile. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

/**
 * Exécute un composable DANS un vrai composant (hooks de cycle de vie, inject, scope d'effets),
 * avec Pinia et TanStack Query installés. Appelez `unmount()` en fin de test.
 */
export function withSetup<T>(
  composable: () => T,
  options: { plugins?: Plugin[]; queryClient?: QueryClient } = {},
): { result: T; app: App; pinia: Pinia; queryClient: QueryClient; unmount: () => void } {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const pinia = createPinia()
  setActivePinia(pinia) // pour utiliser les stores hors composant dans le test
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    },
  })
  app.use(pinia).use(VueQueryPlugin, { queryClient })
  for (const plugin of options.plugins ?? []) app.use(plugin)
  app.mount(document.createElement('div'))
  return { result, app, pinia, queryClient, unmount: () => app.unmount() }
}
