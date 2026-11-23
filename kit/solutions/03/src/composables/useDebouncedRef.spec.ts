import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, watch } from 'vue'
import { useDebouncedRef } from './useDebouncedRef'

describe('useDebouncedRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('garde la valeur initiale tant que le délai n’est pas écoulé', () => {
    const query = useDebouncedRef('', 300)
    query.value = 'pho'
    vi.advanceTimersByTime(299)
    expect(query.value).toBe('')
    vi.advanceTimersByTime(1)
    expect(query.value).toBe('pho')
  })

  it('ne retient que la dernière saisie d’une rafale', () => {
    const query = useDebouncedRef('', 300)
    query.value = 'p'
    vi.advanceTimersByTime(100)
    query.value = 'ph'
    vi.advanceTimersByTime(100)
    query.value = 'pho'
    vi.advanceTimersByTime(299)
    expect(query.value).toBe('')
    vi.advanceTimersByTime(1)
    expect(query.value).toBe('pho')
  })

  it('prévient les watchers une seule fois, avec la valeur finale', async () => {
    const query = useDebouncedRef('', 300)
    const seen: string[] = []
    watch(query, (value) => seen.push(value))
    query.value = 'p'
    query.value = 'ph'
    query.value = 'pho'
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(seen).toEqual(['pho'])
  })

  it('utilise 300 ms par défaut', () => {
    const query = useDebouncedRef(0)
    query.value = 1
    vi.advanceTimersByTime(299)
    expect(query.value).toBe(0)
    vi.advanceTimersByTime(1)
    expect(query.value).toBe(1)
  })

  it('n’écrit plus rien après la destruction du scope (pas de minuteur orphelin)', () => {
    const scope = effectScope()
    const query = scope.run(() => useDebouncedRef('a', 300))!
    query.value = 'b'
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(query.value).toBe('a')
  })
})
