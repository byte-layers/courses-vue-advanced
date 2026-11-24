import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { productRoutes } from '@/features/products/routes'
import { cartRoutes } from '@/features/cart/routes'
import { authRoutes } from '@/features/auth/routes'
import { auctionRoutes } from '@/features/auctions/routes'
import { checkoutRoutes } from '@/features/checkout/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { createAuthGuard } from './guards'
import './types'

/**
 * Fabrique du routeur : l'application lui donne l'historique du navigateur, les tests un historique
 * en mémoire (`createMemoryHistory()`), avec les VRAIES routes et la VRAIE garde.
 */
export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', redirect: '/home' },
      { path: '/home', name: 'home', component: () => import('@/pages/HomePage.vue') },
      { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
      // Chaque fonctionnalité déclare ses propres routes, dont les pages sont chargées à la demande.
      ...productRoutes,
      ...cartRoutes,
      ...authRoutes,
      ...auctionRoutes,
      ...checkoutRoutes,
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/NotFoundPage.vue'),
      },
    ],
  })

  // Le store est lu au moment de la navigation : Pinia est installé avant la première.
  router.beforeEach(createAuthGuard(() => useAuthStore().isAuthenticated))
  return router
}

export default createAppRouter()
