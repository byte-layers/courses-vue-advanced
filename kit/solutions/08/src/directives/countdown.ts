import type { Directive } from 'vue'

export interface CountdownValue {
  /** Fin du compte à rebours, en ms (horloge du serveur si `offset` est fourni). */
  endsAt: number
  /** Décalage d'horloge : heure du serveur moins heure du client, en ms. Défaut 0. */
  offset?: number
  /** Appelé une fois, quand le temps est écoulé. */
  onEnd?: () => void
}

/** 90 500 ms -> « 01:30 » ; au-delà d'une heure -> « 1:01:30 ». Jamais négatif. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

interface CountdownState {
  timer: ReturnType<typeof setInterval>
  ended: boolean
}

const states = new WeakMap<HTMLElement, CountdownState>()

function stop(el: HTMLElement) {
  const state = states.get(el)
  if (state) clearInterval(state.timer)
  states.delete(el)
}

function start(el: HTMLElement, value: CountdownValue) {
  stop(el)
  const state: CountdownState = {
    timer: 0 as unknown as ReturnType<typeof setInterval>,
    ended: false,
  }
  const tick = () => {
    const remaining = value.endsAt - (Date.now() + (value.offset ?? 0))
    el.textContent = formatRemaining(remaining)
    if (remaining <= 0) {
      clearInterval(state.timer)
      if (!state.ended) {
        state.ended = true
        value.onEnd?.()
      }
    }
  }
  states.set(el, state)
  tick()
  if (!state.ended) state.timer = setInterval(tick, 1000)
}

/** v-countdown="{ endsAt, offset }" : affiche le temps restant dans l'élément, une fois par seconde. */
export const vCountdown: Directive<HTMLElement, CountdownValue> = {
  mounted(el, binding) {
    start(el, binding.value)
  },
  updated(el, binding) {
    const { endsAt, offset } = binding.value
    const old = binding.oldValue
    // On ne relance que si la cible change : pas à chaque rendu du parent.
    if (!old || old.endsAt !== endsAt || old.offset !== offset) start(el, binding.value)
  },
  unmounted(el) {
    stop(el)
  },
}

// Déclare la directive globale : `v-countdown` est vérifiée par vue-tsc dans les gabarits.
declare module 'vue' {
  interface GlobalDirectives {
    vCountdown: typeof vCountdown
  }
}
