import { z } from 'zod'

// Les réponses de l'API sont inconnues à la compilation : on les VALIDE à l'exécution,
// et le type TypeScript se déduit du schéma (une seule définition).

export const productSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number().int().nonnegative(),
  brand: z.string().optional(), // absent sur certains produits DummyJSON
  thumbnail: z.string(),
  images: z.array(z.string()),
})

export const productListSchema = z.object({
  products: z.array(productSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
})

export const categorySchema = z.object({ slug: z.string(), name: z.string(), url: z.string() })
export const categoriesSchema = z.array(categorySchema)

/** Réponse de POST /carts/add : un panier fictif, DummyJSON ne stocke rien. */
export const cartAddResponseSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  totalProducts: z.number().int(),
  totalQuantity: z.number().int(),
})

export type Product = z.infer<typeof productSchema>
export type ProductList = z.infer<typeof productListSchema>
export type Category = z.infer<typeof categorySchema>
export type CartAddResponse = z.infer<typeof cartAddResponseSchema>
