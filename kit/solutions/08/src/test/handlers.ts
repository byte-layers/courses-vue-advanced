// Les handlers MSW RÉUTILISABLES : un faux DummyJSON en mémoire.
// Ils servent aux tests Vitest (`server.use(...)` pour adapter un cas) et serviront tels quels aux scénarios
// E2E de la session 2 (Playwright peut les brancher avec `msw` côté navigateur, ou on s'en inspire pour `page.route`).
import { delay, http, HttpResponse } from 'msw'
import { API_URL } from '@/api/config'
import { handlers as catalogHandlers } from './msw/handlers'

export { paginate } from './msw/handlers'

/** Le compte de démonstration de DummyJSON. */
export const demoUser = {
  id: 1,
  username: 'emilys',
  password: 'emilyspass',
  firstName: 'Emily',
  lastName: 'Johnson',
  image: 'https://dummyjson.com/icon/emilys/128',
}

export const demoTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' }

/** Catalogue, recherche, catégories, fiche produit, `POST /carts/add` (voir msw/handlers.ts). */
export const productAndCartHandlers = catalogHandlers

/** Connexion, profil, renouvellement des jetons. */
export const authHandlers = [
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }
    if (body.username !== demoUser.username || body.password !== demoUser.password) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
    }
    const { password: _password, ...profile } = demoUser
    return HttpResponse.json({ ...profile, ...demoTokens })
  }),
  http.get(`${API_URL}/auth/me`, ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${demoTokens.accessToken}`) {
      return HttpResponse.json({ message: 'Token Expired!' }, { status: 401 })
    }
    const { password: _password, ...profile } = demoUser
    return HttpResponse.json({ ...profile, email: 'emily.johnson@x.dummyjson.com' })
  }),
  http.post(`${API_URL}/auth/refresh`, () => HttpResponse.json(demoTokens)),
]

/** Tout : ce qu'un test de page complète ou un scénario E2E branche par défaut. */
export const allHandlers = [...productAndCartHandlers, ...authHandlers]

/** Des variantes d'ERREUR prêtes à l'emploi : `server.use(failures.cartAdd())`. */
export const failures = {
  /** `POST /carts/add` refusé (500 par défaut), éventuellement après un délai. */
  cartAdd: (status = 500, wait = 0) =>
    http.post(`${API_URL}/carts/add`, async () => {
      await delay(wait)
      return HttpResponse.json({ message: 'refusé' }, { status })
    }),
  /** La liste des produits répond une erreur serveur. */
  products: (status = 500) =>
    http.get(`${API_URL}/products`, () => HttpResponse.json({ message: 'panne' }, { status })),
  /** Les identifiants sont refusés. */
  login: () =>
    http.post(`${API_URL}/auth/login`, () =>
      HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 }),
    ),
}
