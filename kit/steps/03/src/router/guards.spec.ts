import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createAuthGuard } from './guards'
import './types'

const Page = { render: () => null }

function setup(authenticated: boolean | (() => boolean)) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'home', component: Page },
      { path: '/login', name: 'login', component: Page },
      { path: '/products', name: 'products', component: Page },
      { path: '/account', name: 'account', component: Page, meta: { requiresAuth: true } },
    ],
  })
  router.beforeEach(
    createAuthGuard(typeof authenticated === 'function' ? authenticated : () => authenticated),
  )
  return router
}

describe('garde d’authentification', () => {
  it('laisse passer une route publique', async () => {
    const router = setup(false)
    await router.push('/products')
    expect(router.currentRoute.value.name).toBe('products')
  })

  it('redirige vers /login avec l’adresse demandée quand il n’y a pas de session', async () => {
    const router = setup(false)
    await router.push('/account?tab=orders')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/account?tab=orders')
  })

  it('laisse passer une route protégée avec une session', async () => {
    const router = setup(true)
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('account')
  })

  it('renvoie à l’accueil quand on ouvre /login avec une session', async () => {
    const router = setup(true)
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('relit la session à chaque navigation', async () => {
    let authenticated = false
    const router = setup(() => authenticated)
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('login')
    authenticated = true
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('account')
  })
})
