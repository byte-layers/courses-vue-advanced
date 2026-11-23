import { createRouter, createWebHistory } from 'vue-router'
import { productRoutes } from '@/features/products/routes'
import { cartRoutes } from '@/features/cart/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
    // Chaque fonctionnalité déclare ses propres routes, dont les pages sont chargées à la demande.
    ...productRoutes,
    ...cartRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

export default router
