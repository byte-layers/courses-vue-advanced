import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

/** Journal des requêtes reçues : « GET /products?limit=12&skip=0 » (sans l'URL de base). */
export const requestLog: string[] = []

server.events.on('request:start', ({ request }) => {
  const url = new URL(request.url)
  requestLog.push(`${request.method} ${url.pathname}${url.search}`)
})

/** À appeler une fois en haut d'un fichier de test : démarre, remet à zéro et ferme le faux serveur. */
export function useMockServer() {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    requestLog.length = 0
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
