import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { checkoutSchema } from './checkoutSchema'
import { toVeeSchema } from './toVeeSchema'

const valid = {
  fullName: 'Emily Johnson',
  email: 'emily@example.com',
  address: '12 rue des Lilas',
  postalCode: '31000',
  city: 'Toulouse',
  delivery: 'standard' as const,
  acceptTerms: true as const,
}

describe('toVeeSchema (zod 4 -> VeeValidate)', () => {
  it('se déclare comme un schéma typé VeeValidate', () => {
    expect(toVeeSchema(z.object({})).__type).toBe('VVTypedSchema')
  })

  it('valeurs valides : renvoie la valeur validée et aucune erreur', async () => {
    const result = await toVeeSchema(checkoutSchema).parse(valid)
    expect(result.errors).toEqual([])
    expect(result.value).toEqual(valid)
  })

  it('applique les transformations de zod (trim) dans la valeur renvoyée', async () => {
    const result = await toVeeSchema(checkoutSchema).parse({ ...valid, city: '  Toulouse  ' })
    expect(result.value?.city).toBe('Toulouse')
  })

  it('groupe les messages par champ, avec le chemin du champ', async () => {
    const result = await toVeeSchema(checkoutSchema).parse({
      ...valid,
      email: 'pas-un-email',
      postalCode: '31',
    })
    expect(result.value).toBeUndefined()
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { path: 'email', errors: ['Cette adresse e-mail n’est pas valide.'] },
        { path: 'postalCode', errors: ['Le code postal comporte 5 chiffres.'] },
      ]),
    )
    expect(result.errors).toHaveLength(2)
  })

  it('plusieurs problèmes sur le même champ : tous les messages, dans l’ordre', async () => {
    const schema = z.object({ pwd: z.string().min(8, 'trop court').regex(/\d/, 'un chiffre requis') })
    const result = await toVeeSchema(schema).parse({ pwd: 'abc' })
    expect(result.errors).toEqual([{ path: 'pwd', errors: ['trop court', 'un chiffre requis'] }])
  })

  it('les chemins imbriqués sont séparés par un point', async () => {
    const schema = z.object({ user: z.object({ name: z.string().min(1, 'requis') }) })
    const result = await toVeeSchema(schema).parse({ user: { name: '' } })
    expect(result.errors).toEqual([{ path: 'user.name', errors: ['requis'] }])
  })

  it('les conditions de vente doivent être cochées', async () => {
    const result = await toVeeSchema(checkoutSchema).parse({
      ...valid,
      acceptTerms: false as unknown as true,
    })
    expect(result.errors).toEqual([
      { path: 'acceptTerms', errors: ['Vous devez accepter les conditions de vente.'] },
    ])
  })

  it('accepte un schéma asynchrone (refine async)', async () => {
    const schema = z.object({ name: z.string().refine(async (v) => v !== 'pris', 'nom déjà pris') })
    expect((await toVeeSchema(schema).parse({ name: 'libre' })).errors).toEqual([])
    expect((await toVeeSchema(schema).parse({ name: 'pris' })).errors).toEqual([
      { path: 'name', errors: ['nom déjà pris'] },
    ])
  })
})
