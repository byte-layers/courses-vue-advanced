import { describe, expect, it } from 'vitest'
import {
  cartAddResponseSchema,
  categoriesSchema,
  productListSchema,
  productSchema,
} from './schemas'
import { catalog, categories, makeProduct } from '@/test/fixtures'

describe('schémas zod du catalogue', () => {
  it('accepte un produit complet et en renvoie les données', () => {
    const product = makeProduct(1)
    expect(productSchema.parse(product)).toEqual(product)
  })

  it('accepte un produit sans marque (brand est facultatif)', () => {
    const { brand: _brand, ...withoutBrand } = makeProduct(2)
    expect(productSchema.safeParse(withoutBrand).success).toBe(true)
  })

  it('refuse un prix qui est une chaîne, et nomme le champ fautif', () => {
    const result = productSchema.safeParse({ ...makeProduct(3), price: '12.5' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['price'])
  })

  it('refuse un produit sans titre', () => {
    const { title: _title, ...withoutTitle } = makeProduct(4)
    expect(productSchema.safeParse(withoutTitle).success).toBe(false)
  })

  it('ignore les champs inconnus (ils n’arrivent pas jusqu’au code)', () => {
    const parsed = productSchema.parse({ ...makeProduct(5), sku: 'ABC', meta: { barcode: '1' } })
    expect(parsed).not.toHaveProperty('sku')
    expect(parsed).not.toHaveProperty('meta')
  })

  it('valide une page de produits à la DummyJSON', () => {
    const body = { products: catalog.slice(0, 3), total: 30, skip: 0, limit: 3 }
    expect(productListSchema.parse(body).products).toHaveLength(3)
    expect(productListSchema.safeParse({ ...body, total: 'beaucoup' }).success).toBe(false)
  })

  it('valide la liste des catégories', () => {
    expect(categoriesSchema.parse(categories)).toHaveLength(2)
    expect(categoriesSchema.safeParse(['beauty']).success).toBe(false) // l'ancien format (chaînes) est refusé
  })

  it('valide la réponse de POST /carts/add', () => {
    const body = { id: 51, userId: 1, totalProducts: 1, totalQuantity: 2, products: [] }
    expect(cartAddResponseSchema.parse(body)).toEqual({
      id: 51,
      userId: 1,
      totalProducts: 1,
      totalQuantity: 2,
    })
  })
})
