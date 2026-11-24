import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'

/**
 * Adaptateur zod 4 -> VeeValidate. Le paquet officiel `@vee-validate/zod` demande zod 3 (peerDependency
 * `zod: ^3.24.0`) : avec zod 4 on écrit les quelques lignes de l'interface `TypedSchema` soi-même.
 * VeeValidate appelle `parse(valeurs)` et attend `{ value, errors: [{ path, errors: [messages] }] }`.
 */
export function toVeeSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      // zod donne une liste de problèmes ; VeeValidate veut les messages groupés par champ.
      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        byPath.set(path, [...(byPath.get(path) ?? []), issue.message])
      }
      return { errors: [...byPath].map(([path, errors]) => ({ path, errors })) }
    },
  }
}
