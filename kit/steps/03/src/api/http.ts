/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
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

  // Support (à garder tel quel) : un envoi, avec le Bearer s'il y a un jeton.
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

  // Support : lit le JSON, ou jette une HttpError si le statut n'est pas 2xx.
  async function parse<T>(response: Response, path: string): Promise<T> {
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => undefined)
      throw new HttpError(response.status, path, body)
    }
    return (await response.json()) as T
  }

  /**
   * TODO 1 — Une seule requête de renouvellement à la fois.
   * Si `refreshing` est vide, appelez `options.auth.refresh()` et rangez la promesse dans `refreshing` ;
   * sinon renvoyez la promesse en cours. Quand elle se termine (succès ou échec), videz `refreshing`.
   * Si le renouvellement échoue : appelez `onAuthFailure()` UNE fois, puis laissez l'erreur remonter.
   */
  function refreshOnce(): Promise<string> {
    throw new Error('À écrire')
  }

  /**
   * TODO 2 — Envoie la requête avec le jeton courant. Sur un 401 (hors `skipAuth`, avec `options.auth`) :
   *  - si le jeton courant n'est plus celui qui a servi à l'envoi, un renouvellement a déjà eu lieu :
   *    rejouez avec le jeton courant, sans renouveler ;
   *  - sinon `await refreshOnce()` puis rejouez UNE seule fois (pas de boucle si le rejeu fait 401) ;
   *  - si le renouvellement échoue, rejetez avec `new HttpError(401, path)`.
   * Dans tous les cas, terminez par `parse(response, path)`.
   */
  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    throw new Error('À écrire')
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
