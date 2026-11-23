import type { RouteRecordRaw } from 'vue-router'

export const cartRoutes: RouteRecordRaw[] = [
  { path: '/cart', name: 'cart', component: () => import('./pages/CartPage.vue') },
]
