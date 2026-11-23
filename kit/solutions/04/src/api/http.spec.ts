import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, HttpError, type AuthHandlers } from './http'

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Faux fetch : le gestionnaire reçoit l'URL et l'en-tête Authorization envoyés. */
function fakeFetch(
  handler: (url: string, authorization: string | null) => Response | Promise<Response>,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), new Headers(init?.headers).get('Authorization')),
  )
}

/** Session simulée : jeton « old » périmé, « new » valide après renouvellement (10 ms). */
function fakeAuth(options: { refreshFails?: boolean } = {}) {
  let token: string | null = 'old'
  const auth: AuthHandlers & { setToken(t: string): void } = {
    getAccessToken: () => token,
    refresh: vi.fn(
      () =>
        new Promise<string>((resolve, reject) =>
          setTimeout(() => {
            if (options.refreshFails) return reject(new Error('refresh refusé'))
            token = 'new'
            resolve('new')
          }, 10),
        ),
    ),
    onAuthFailure: vi.fn(),
    setToken: (t) => void (token = t),
  }
  return auth
}

/** Le serveur n'accepte que « Bearer new ». */
const strictServer = (url: string, authorization: string | null) =>
  authorization === 'Bearer new' ? reply(200, { url }) : reply(401)

describe('client http', () => {
  it('préfixe l’URL de base et ajoute le Bearer quand une session existe', async () => {
    const fetch = fakeFetch((url, authorization) => reply(200, { url, authorization }))
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth: fakeAuth() })
    const result = await http.get<{ url: string; authorization: string }>('/products')
    expect(result).toEqual({ url: 'https://api.test/products', authorization: 'Bearer old' })
  })

  it('n’ajoute pas d’en-tête Authorization sans session', async () => {
    const fetch = fakeFetch((_url, authorization) => reply(200, { authorization }))
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch })
    expect(await http.get('/products')).toEqual({ authorization: null })
  })

  it('envoie un corps JSON avec son Content-Type (post)', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => reply(200, {}))
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch })
    await http.post('/auth/login', { username: 'emilys' })
    const init = fetch.mock.calls[0]?.[1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"username":"emilys"}')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('rejette avec une HttpError portant le statut', async () => {
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(() => reply(500, { message: 'boom' })),
    })
    const error = await http.get('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status: 500, body: { message: 'boom' } })
  })

  it('sur 401 : renouvelle le jeton puis rejoue la requête avec le nouveau', async () => {
    const auth = fakeAuth()
    const fetch = fakeFetch(strictServer)
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth })
    expect(await http.get('/auth/me')).toEqual({ url: 'https://api.test/auth/me' })
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('trois requêtes en échec en parallèle ne provoquent QU’UN renouvellement', async () => {
    const auth = fakeAuth()
    const fetch = fakeFetch(strictServer)
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth })
    const results = await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')])
    expect(results).toEqual([
      { url: 'https://api.test/a' },
      { url: 'https://api.test/b' },
      { url: 'https://api.test/c' },
    ])
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(6) // 3 échecs + 3 rejeux
  })

  it('un nouveau 401 plus tard déclenche un nouveau renouvellement (le verrou est libéré)', async () => {
    const auth = fakeAuth()
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(strictServer),
      auth,
    })
    await http.get('/a')
    auth.setToken('old') // le jeton expire à nouveau
    await http.get('/b')
    expect(auth.refresh).toHaveBeenCalledTimes(2)
  })

  it('une requête en retard rejoue avec le jeton déjà renouvelé, sans renouveler encore', async () => {
    const auth = fakeAuth()
    let first = true
    const fetch = fakeFetch(async (url, authorization) => {
      if (first) {
        first = false
        auth.setToken('new') // un renouvellement s'est terminé pendant que cette requête était en vol
        return reply(401)
      }
      return strictServer(url, authorization)
    })
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth })
    await http.get('/late')
    expect(auth.refresh).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('si le renouvellement échoue : onAuthFailure une fois, et toutes les requêtes rejettent en 401', async () => {
    const auth = fakeAuth({ refreshFails: true })
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      fetch: fakeFetch(strictServer),
      auth,
    })
    const results = await Promise.allSettled([http.get('/a'), http.get('/b'), http.get('/c')])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    for (const r of results) {
      expect((r as PromiseRejectedResult).reason).toMatchObject({ status: 401 })
    }
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(auth.onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('ne boucle pas : si le rejeu reçoit encore 401, on rejette', async () => {
    const auth = fakeAuth()
    const fetch = fakeFetch(() => reply(401))
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth })
    await expect(http.get('/x')).rejects.toMatchObject({ status: 401 })
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('skipAuth : pas de Bearer et pas de renouvellement sur 401 (connexion)', async () => {
    const auth = fakeAuth()
    const fetch = fakeFetch((_url, authorization) =>
      authorization ? reply(500) : reply(400, { message: 'Invalid credentials' }),
    )
    const http = createHttpClient({ baseUrl: 'https://api.test', fetch, auth })
    await expect(http.post('/auth/login', {}, { skipAuth: true })).rejects.toMatchObject({
      status: 400,
    })
    expect(auth.refresh).not.toHaveBeenCalled()
  })
})
