import type { RouteRecordRaw } from 'vue-router'

// Le module produits déclare ses routes ; chaque page est un chunk chargé à la demande.
export const productRoutes: RouteRecordRaw[] = [
  {
    path: '/products',
    children: [
      {
        path: '',
        name: 'products',
        component: () => import('./pages/ProductListPage.vue'),
      },
      {
        path: ':id(\\d+)',
        name: 'product',
        component: () => import('./pages/ProductDetailPage.vue'),
        props: (route) => ({ id: Number(route.params.id) }),
      },
    ],
  },
]
