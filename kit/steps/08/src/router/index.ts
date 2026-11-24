import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import { productRoutes } from '@/features/products/routes'
import { cartRoutes } from '@/features/cart/routes'
import { authRoutes } from '@/features/auth/routes'
import { auctionRoutes } from '@/features/auctions/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { createAuthGuard } from './guards'
import './types'

// L'option « commande » de l'étape 06 est facultative : ses routes sont ajoutées SI le fichier existe
// (import.meta.glob ne casse pas le build quand il est absent). Sans l'option, /checkout est une page 404.
const optionalCheckout = import.meta.glob<{ checkoutRoutes: RouteRecordRaw[] }>('@/features/checkout/routes.ts', {
  eager: true,
})
const checkoutRoutes = Object.values(optionalCheckout).flatMap((module) => module.checkoutRoutes)

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
