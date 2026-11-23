import { API_URL } from './config'

/** Ce que le client attend de la session : le jeton courant, comment le renouveler, que faire si on n'y arrive pas. */
export interface AuthHandlers {
  getAccessToken(): string | null
  /** Renouvelle les jetons et renvoie le nouveau jeton d'accès. Rejette si le renouvellement échoue. */
  refresh(): Promise<string>
  /** Appelé une seule fois quand la session est définitivement perdue. */
  onAuthFailure(): void
}

export interface HttpOptions {
  baseUrl: string
  /** Remplaçable pour les tests. */
  fetch?: typeof fetch
  auth?: AuthHandlers
}

export interface RequestOptions {
  method?: string
  /** Corps JSON : sérialisé, avec l'en-tête Content-Type. */
  json?: unknown
  signal?: AbortSignal
  /** Appel public (connexion, renouvellement) : ni Bearer, ni renouvellement sur 401. */
  skipAuth?: boolean
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body?: unknown,
  ) {
    super(`HTTP ${status} sur ${url}`)
    this.name = 'HttpError'
  }
}

export function createHttpClient(options: HttpOptions) {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  // Renouvellement en cours : toutes les requêtes en échec s'accrochent à la même promesse.
  let refreshing: Promise<string> | null = null

  function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
    const headers = new Headers()
    if (opts.json !== undefined) headers.set('Content-Type', 'application/json')
    if (token && !opts.skipAuth) headers.set('Authorization', `Bearer ${token}`)
    return doFetch(`${options.baseUrl}${path}`, {
      method: opts.method ?? (opts.json !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
      signal: opts.signal,
    })
  }

  /** Une seule requête de renouvellement à la fois, même si dix requêtes échouent ensemble. */
  function refreshOnce(): Promise<string> {
    const auth = options.auth
    if (!auth) return Promise.reject(new Error('Pas de gestionnaire de session'))
    refreshing ??= auth
      .refresh()
      .catch((error: unknown) => {
        auth.onAuthFailure() // une seule fois : la promesse est partagée
        throw error
      })
      .finally(() => {
        refreshing = null
      })
    return refreshing
  }

  async function parse<T>(response: Response, path: string): Promise<T> {
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined)
      throw new HttpError(response.status, path, body)
    }
    return (await response.json()) as T
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const auth = options.auth
    const usedToken = auth?.getAccessToken() ?? null
    let response = await send(path, opts, usedToken)

    if (response.status === 401 && auth && !opts.skipAuth) {
      // Un renouvellement a peut-être déjà eu lieu pendant que cette requête était en vol :
      // dans ce cas le jeton courant a changé, on rejoue simplement avec lui.
      const current = auth.getAccessToken()
      let token: string
      try {
        token = current && current !== usedToken ? current : await refreshOnce()
      } catch {
        throw new HttpError(401, path)
      }
      response = await send(path, opts, token) // rejeu unique : pas de boucle
    }
    return parse<T>(response, path)
  }

  return {
    request,
    get: <T>(path: string, opts: Omit<RequestOptions, 'json' | 'method'> = {}) =>
      request<T>(path, { ...opts, method: 'GET' }),
    post: <T>(path: string, json?: unknown, opts: Omit<RequestOptions, 'json'> = {}) =>
      request<T>(path, { ...opts, method: 'POST', json: json ?? {} }),
    /** Branche la session (appelé par le store d'authentification). */
    setAuth(handlers: AuthHandlers | undefined) {
      options.auth = handlers
    },
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>

/** Le client unique de l'application. */
export const http: HttpClient = createHttpClient({ baseUrl: API_URL })
