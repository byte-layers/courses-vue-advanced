/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import { z } from 'zod'
import type { Product, ProductList } from './types'

// Les réponses de l'API sont inconnues à la compilation : on les VALIDE à l'exécution,
// et le type TypeScript se déduit du schéma (une seule définition).
//
// TODO — Remplacez chaque `z.custom(todo)` par un vrai schéma `z.object({...})`.
// Champs d'un produit DummyJSON : id (entier), title, description, category, thumbnail (chaînes),
// price (nombre >= 0), discountPercentage, rating (nombres), stock (entier >= 0), images (tableau de
// chaînes), et `brand` FACULTATIF (plus de la moitié des produits n'en ont pas).
// Une page de produits : { products, total, skip, limit }. Une catégorie : { slug, name, url }.
// La réponse de POST /carts/add : { id, userId, totalProducts, totalQuantity } (entiers).
// Quand les schémas passent, supprimez les types écrits à la main ci-dessous et dans types.ts :
// `export type Product = z.infer<typeof productSchema>`, etc., puis faites que types.ts les ré-exporte.

const todo = (): never => {
  throw new Error('À écrire')
}

export const productSchema = z.custom<Product>(todo)
export const productListSchema = z.custom<ProductList>(todo)
export const categorySchema = z.custom<Category>(todo)
export const categoriesSchema = z.array(categorySchema)
export const cartAddResponseSchema = z.custom<CartAddResponse>(todo)

// À remplacer par `z.infer<typeof ...Schema>`.
export interface Category {
  slug: string
  name: string
  url: string
}
export interface CartAddResponse {
  id: number
  userId: number
  totalProducts: number
  totalQuantity: number
}
