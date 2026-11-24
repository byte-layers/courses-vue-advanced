import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/features/auth/authStore'

// Le VRAI routeur (routes, garde) avec un historique en mémoire ; la session est posée dans le store d'authentification.
function setup(signedIn: boolean) {
  setActivePinia(createPinia())
  localStorage.clear()
  const auth = useAuthStore()
  if (signedIn) {
    auth.session = {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 1, username: 'emilys', firstName: 'Emily', lastName: 'Johnson', image: '' },
    }
  }
  const router = createAppRouter(createMemoryHistory())
  const go = async (path: string) => {
    await router.push(path)
    await flushPromises()
    return router.currentRoute.value
  }
  return { router, go, auth }
}

describe('navigation (router.push + flushPromises)', () => {
  it('« / » redirige vers /home', async () => {
    const { go } = setup(false)
    expect((await go('/')).fullPath).toBe('/home')
  })

  it('une page publique est accessible sans session', async () => {
    const { go } = setup(false)
    expect((await go('/products')).name).toBe('products')
  })

  it('/account sans session : redirection vers /login avec l’adresse demandée', async () => {
    const { go } = setup(false)
    const route = await go('/account')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/account')
  })

  it('/checkout sans session : bloqué, avec retour prévu vers /checkout', async () => {
    const { go } = setup(false)
    const route = await go('/checkout')
    expect(route.fullPath).toBe('/login?redirect=/checkout')
  })

  it('avec une session, /account est accessible', async () => {
    const { go } = setup(true)
    expect((await go('/account')).name).toBe('account')
  })

  it('avec une session, /login renvoie à l’accueil', async () => {
    const { go } = setup(true)
    expect((await go('/login')).name).toBe('home')
  })

  it('la garde relit la session à chaque navigation : après la déconnexion, /account est de nouveau bloqué', async () => {
    const { go, auth } = setup(true)
    expect((await go('/account')).name).toBe('account')
    auth.logout()
    expect((await go('/cart')).name).toBe('cart')
    expect((await go('/account')).name).toBe('login')
  })

  it('/products/42 : l’identifiant devient un nombre dans la route', async () => {
    const { go } = setup(false)
    const route = await go('/products/42')
    expect(route.name).toBe('product')
    expect(route.params.id).toBe('42')
  })

  it('/products/abc ne correspond pas au produit (id numérique) : page introuvable', async () => {
    const { go } = setup(false)
    expect((await go('/products/abc')).name).toBe('not-found')
  })

  it('une adresse inconnue mène à la page 404', async () => {
    const { go } = setup(false)
    expect((await go('/nimporte/quoi')).name).toBe('not-found')
  })
})
