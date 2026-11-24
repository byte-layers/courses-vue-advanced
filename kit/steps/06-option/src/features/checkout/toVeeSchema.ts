import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'

/**
 * TODO — À écrire : l'adaptateur zod 4 -> VeeValidate.
 * Le paquet officiel `@vee-validate/zod` demande zod 3 (peerDependency `zod: ^3.24.0`) : avec zod 4 on écrit
 * soi-même l'interface `TypedSchema` de VeeValidate. Rendez :
 *  - `__type: 'VVTypedSchema'` ;
 *  - `parse(values)` asynchrone : `schema.safeParseAsync(values)` ; succès -> `{ value: result.data, errors: [] }` ;
 *    échec -> `{ errors: [{ path, errors: [messages] }] }` : les problèmes de `result.error.issues` regroupés par champ
 *    (`path` = `issue.path.join('.')`, messages dans l'ordre).
 */
export function toVeeSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  throw new Error('À écrire')
}
