import { createRouter, createWebHistory } from 'vue-router'
import { productRoutes } from '@/features/products/routes'
import { cartRoutes } from '@/features/cart/routes'
import { authRoutes } from '@/features/auth/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { createAuthGuard } from './guards'
import './types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
    // Chaque fonctionnalité déclare ses propres routes, dont les pages sont chargées à la demande.
    ...productRoutes,
    ...cartRoutes,
    ...authRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

// Le store est lu au moment de la navigation : Pinia est installé avant la première.
router.beforeEach(createAuthGuard(() => useAuthStore().isAuthenticated))

export default router
