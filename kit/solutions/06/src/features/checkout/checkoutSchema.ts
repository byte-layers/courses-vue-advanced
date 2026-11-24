import { z } from 'zod'

/**
 * Le formulaire de commande, décrit UNE fois avec zod : la même description valide les saisies
 * (messages affichés à côté de chaque champ) et fixe le type des valeurs.
 */
export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, 'Indiquez votre nom complet.'),
  email: z.email('Cette adresse e-mail n’est pas valide.'),
  address: z.string().trim().min(5, 'Indiquez votre adresse (numéro et rue).'),
  postalCode: z.string().regex(/^\d{5}$/, 'Le code postal comporte 5 chiffres.'),
  city: z.string().trim().min(2, 'Indiquez votre ville.'),
  delivery: z.enum(['standard', 'express']),
  acceptTerms: z.literal(true, { error: 'Vous devez accepter les conditions de vente.' }),
})

/** Ce que le formulaire contient pendant la saisie (tout peut être vide ou faux)... */
export type CheckoutInput = z.input<typeof checkoutSchema>
/** ... et ce qu'il donne une fois validé. */
export type CheckoutValues = z.output<typeof checkoutSchema>
