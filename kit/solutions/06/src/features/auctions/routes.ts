import type { RouteRecordRaw } from 'vue-router'

export const auctionRoutes: RouteRecordRaw[] = [
  { path: '/auctions', name: 'auctions', component: () => import('./pages/AuctionsPage.vue') },
]
