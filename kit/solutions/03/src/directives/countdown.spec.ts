import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { mount } from '@vue/test-utils'
import { formatRemaining, vCountdown, type CountdownValue } from './countdown'

const NOW = new Date('2026-01-01T12:00:00Z').getTime()

/** Monte un <span v-countdown="value.value"> ; changer `value` re-rend le composant. */
function mountCountdown(initial: CountdownValue) {
  const value = ref(initial)
  const Comp = defineComponent({
    setup: () => () => withDirectives(h('span'), [[vCountdown, value.value]]),
  })
  return { wrapper: mount(Comp), value }
}

describe('formatRemaining', () => {
  it('formate en mm:ss, jamais négatif', () => {
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(-5000)).toBe('00:00')
    expect(formatRemaining(59_000)).toBe('00:59')
    expect(formatRemaining(90_000)).toBe('01:30')
  })

  it('arrondit à la seconde supérieure et passe en h:mm:ss au-delà d’une heure', () => {
    expect(formatRemaining(500)).toBe('00:01')
    expect(formatRemaining(3_661_000)).toBe('1:01:01')
  })
})

describe('v-countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche tout de suite le temps restant', () => {
    const { wrapper } = mountCountdown({ endsAt: NOW + 90_000 })
    expect(wrapper.text()).toBe('01:30')
  })

  it('se met à jour chaque seconde', () => {
    const { wrapper } = mountCountdown({ endsAt: NOW + 90_000 })
    vi.advanceTimersByTime(1000)
    expect(wrapper.text()).toBe('01:29')
    vi.advanceTimersByTime(10_000)
    expect(wrapper.text()).toBe('01:19')
  })

  it('tient compte du décalage d’horloge (serveur en avance de 10 s)', () => {
    const { wrapper } = mountCountdown({ endsAt: NOW + 90_000, offset: 10_000 })
    expect(wrapper.text()).toBe('01:20')
  })

  it('s’arrête à 00:00, appelle onEnd une seule fois et libère son minuteur', () => {
    const onEnd = vi.fn()
    const { wrapper } = mountCountdown({ endsAt: NOW + 2000, onEnd })
    vi.advanceTimersByTime(2000)
    expect(wrapper.text()).toBe('00:00')
    expect(onEnd).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('est déjà terminé si la date de fin est passée', () => {
    const onEnd = vi.fn()
    const { wrapper } = mountCountdown({ endsAt: NOW - 1000, onEnd })
    expect(wrapper.text()).toBe('00:00')
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('repart sur la nouvelle date quand la valeur change', async () => {
    const { wrapper, value } = mountCountdown({ endsAt: NOW + 10_000 })
    value.value = { endsAt: NOW + 120_000 }
    await nextTick()
    expect(wrapper.text()).toBe('02:00')
  })

  it('supprime son minuteur quand l’élément est détruit', () => {
    const { wrapper } = mountCountdown({ endsAt: NOW + 90_000 })
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
