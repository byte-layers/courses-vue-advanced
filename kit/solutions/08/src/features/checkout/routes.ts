import type { RouteRecordRaw } from 'vue-router'

export const checkoutRoutes: RouteRecordRaw[] = [
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('./pages/CheckoutPage.vue'),
    // Commander demande d'être connecté : la garde du routeur renvoie vers /login?redirect=/checkout.
    meta: { requiresAuth: true },
  },
]
