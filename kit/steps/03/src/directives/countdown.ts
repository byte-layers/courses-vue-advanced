/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { Directive } from 'vue'

export interface CountdownValue {
  /** Fin du compte à rebours, en ms (horloge du serveur si `offset` est fourni). */
  endsAt: number
  /** Décalage d'horloge : heure du serveur moins heure du client, en ms. Défaut 0. */
  offset?: number
  /** Appelé une fois, quand le temps est écoulé. */
  onEnd?: () => void
}

/**
 * TODO 1 — 90 500 ms -> « 01:31 » ; au-delà d'une heure -> « 1:01:31 ». Jamais négatif.
 * Arrondi à la seconde SUPÉRIEURE (Math.ceil) : 500 ms restantes s'affichent « 00:01 ».
 */
export function formatRemaining(ms: number): string {
  throw new Error('À écrire')
}

/**
 * TODO 2 — v-countdown="{ endsAt, offset, onEnd }" : écrit le temps restant dans l'élément,
 * immédiatement puis chaque seconde (setInterval).
 *  - temps restant = endsAt - (Date.now() + (offset ?? 0)) ;
 *  - à 0 : arrêter le minuteur et appeler onEnd UNE fois (même si la date est déjà passée au montage) ;
 *  - `updated` : repartir seulement si endsAt ou offset ont changé (`binding.oldValue`) ;
 *  - `unmounted` : supprimer le minuteur (rien ne doit survivre à l'élément).
 * Indice : gardez l'état de chaque élément dans une `WeakMap<HTMLElement, ...>`.
 */
export const vCountdown: Directive<HTMLElement, CountdownValue> = {
  mounted(el, binding) {
    throw new Error('À écrire')
  },
  updated(el, binding) {
    throw new Error('À écrire')
  },
  unmounted(el) {
    throw new Error('À écrire')
  },
}

// Déclare la directive globale : `v-countdown` est vérifiée par vue-tsc dans les gabarits.
declare module 'vue' {
  interface GlobalDirectives {
    vCountdown: typeof vCountdown
  }
}
