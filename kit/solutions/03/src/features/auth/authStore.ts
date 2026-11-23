import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/api/http'

export interface AuthUser {
  id: number
  username: string
  firstName: string
  lastName: string
  image: string
}

interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

const STORAGE_KEY = 'shop.auth'

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Session>) : null
    return parsed?.accessToken && parsed.refreshToken && parsed.user ? (parsed as Session) : null
  } catch {
    return null
  }
}

/**
 * La session DummyJSON. Les jetons sont gardés dans localStorage pour survivre à un rechargement :
 * choix de démonstration, en production on préférerait un cookie HttpOnly posé par le serveur.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(loadSession())
  const isAuthenticated = computed(() => session.value !== null)
  const user = computed(() => session.value?.user ?? null)
  let sessionExpiredHandler: (() => void) | undefined

  function persist() {
    try {
      if (session.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // stockage indisponible : la session reste en mémoire
    }
  }

  async function login(username: string, password: string) {
    const data = await http.post<Session & AuthUser>(
      '/auth/login',
      { username, password, expiresInMins: 30 },
      { skipAuth: true },
    )
    const { accessToken, refreshToken, id, firstName, lastName, image } = data
    session.value = {
      accessToken,
      refreshToken,
      user: { id, username: data.username, firstName, lastName, image },
    }
    persist()
  }

  function logout() {
    session.value = null
    persist()
  }

  /** Renouvelle les jetons (POST /auth/refresh). Appelé par le client http sur un 401. */
  async function refresh(): Promise<string> {
    const current = session.value
    if (!current) throw new Error('Pas de session à renouveler')
    const data = await http.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: current.refreshToken, expiresInMins: 30 },
      { skipAuth: true },
    )
    session.value = { ...current, ...data }
    persist()
    return data.accessToken
  }

  /** Pour la démonstration : invalide le jeton d'accès, la prochaine requête protégée recevra un 401. */
  function expireAccessToken() {
    if (!session.value) return
    session.value = { ...session.value, accessToken: 'jeton-expire' }
    persist()
  }

  /** L'application décide quoi faire quand la session est perdue (message, redirection). */
  function onSessionExpired(handler: () => void) {
    sessionExpiredHandler = handler
  }

  // Branche le client http : Bearer automatique, renouvellement sur 401.
  http.setAuth({
    getAccessToken: () => session.value?.accessToken ?? null,
    refresh,
    onAuthFailure() {
      logout()
      sessionExpiredHandler?.()
    },
  })

  return {
    session,
    isAuthenticated,
    user,
    login,
    logout,
    refresh,
    expireAccessToken,
    onSessionExpired,
  }
})
