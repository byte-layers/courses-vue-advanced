import type { Product } from '@/features/products/types'

/** Un produit de test complet ; `overrides` change ce qui compte pour le test. */
export function makeProduct(id: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    title: `Produit ${id}`,
    description: `Description du produit ${id}`,
    category: id % 2 === 0 ? 'beauty' : 'furniture',
    price: 10 + id,
    discountPercentage: 5,
    rating: 4.2,
    stock: 20,
    brand: 'Acme',
    thumbnail: `https://cdn.test/${id}.webp`,
    images: [`https://cdn.test/${id}-1.webp`],
    ...overrides,
  }
}

/** Le « catalogue » des tests : 30 produits, ids 1 à 30. */
export const catalog: Product[] = Array.from({ length: 30 }, (_, i) => makeProduct(i + 1))

export const categories = [
  { slug: 'beauty', name: 'Beauty', url: 'https://dummyjson.com/products/category/beauty' },
  {
    slug: 'furniture',
    name: 'Furniture',
    url: 'https://dummyjson.com/products/category/furniture',
  },
]
