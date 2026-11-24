import { describe, expect, it, vi } from 'vitest'
import { miniComputed, miniReactive, miniRef, miniWatchEffect } from './mini-reactivity'

describe('miniRef', () => {
  it('lit et écrit sa valeur', () => {
    const count = miniRef(1)
    expect(count.value).toBe(1)
    count.value = 5
    expect(count.value).toBe(5)
  })
})

describe('miniWatchEffect', () => {
  it("s'exécute tout de suite, puis à chaque changement d'une donnée lue", () => {
    const count = miniRef(0)
    const seen: number[] = []
    miniWatchEffect(() => seen.push(count.value))
    expect(seen).toEqual([0])
    count.value = 1
    count.value = 2
    expect(seen).toEqual([0, 1, 2])
  })

  it('ne se relance pas quand on réécrit la même valeur (Object.is)', () => {
    const count = miniRef(3)
    const effect = vi.fn(() => count.value)
    miniWatchEffect(effect)
    count.value = 3
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it('suit plusieurs sources, et seulement celles qu’il lit', () => {
    const a = miniRef(1)
    const b = miniRef(1)
    const effect = vi.fn(() => a.value)
    miniWatchEffect(effect)
    b.value = 2
    expect(effect).toHaveBeenCalledTimes(1)
    a.value = 2
    expect(effect).toHaveBeenCalledTimes(2)
  })

  it('a des dépendances dynamiques : une branche abandonnée ne déclenche plus rien', () => {
    const useB = miniRef(true)
    const a = miniRef('a')
    const b = miniRef('b')
    const effect = vi.fn(() => (useB.value ? b.value : a.value))
    miniWatchEffect(effect)
    expect(effect).toHaveBeenCalledTimes(1)
    useB.value = false // l'effet lit désormais `a`
    expect(effect).toHaveBeenCalledTimes(2)
    b.value = 'b2' // ... et plus `b`
    expect(effect).toHaveBeenCalledTimes(2)
    a.value = 'a2'
    expect(effect).toHaveBeenCalledTimes(3)
  })

  it('retourne une fonction stop', () => {
    const count = miniRef(0)
    const effect = vi.fn(() => count.value)
    const stop = miniWatchEffect(effect)
    stop()
    count.value = 1
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it('ne boucle pas quand l’effet écrit la donnée qu’il lit', () => {
    const count = miniRef(0)
    const effect = vi.fn(() => {
      count.value = count.value + 1
    })
    miniWatchEffect(effect)
    expect(effect).toHaveBeenCalledTimes(1)
    expect(count.value).toBe(1)
  })

  it("supporte l'imbrication : l'effet parent reste actif après un effet enfant", () => {
    const a = miniRef(0)
    const b = miniRef(0)
    const parent = vi.fn(() => {
      miniWatchEffect(() => b.value) // effet enfant
      return a.value // lu APRÈS l'enfant : doit s'inscrire chez le parent
    })
    miniWatchEffect(parent)
    a.value = 1
    expect(parent).toHaveBeenCalledTimes(2)
  })
})

describe('miniComputed', () => {
  it("est paresseux : le getter n'est appelé qu'à la première lecture", () => {
    const getter = vi.fn(() => 42)
    const value = miniComputed(getter)
    expect(getter).not.toHaveBeenCalled()
    expect(value.value).toBe(42)
    expect(getter).toHaveBeenCalledTimes(1)
  })

  it('met en cache tant que les sources ne changent pas', () => {
    const count = miniRef(2)
    const getter = vi.fn(() => count.value * 2)
    const double = miniComputed(getter)
    expect(double.value).toBe(4)
    expect(double.value).toBe(4)
    expect(getter).toHaveBeenCalledTimes(1)
    count.value = 3
    expect(getter).toHaveBeenCalledTimes(1) // toujours paresseux
    expect(double.value).toBe(6)
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('relance un effet qui le lit quand sa source change', () => {
    const count = miniRef(1)
    const double = miniComputed(() => count.value * 2)
    const seen: number[] = []
    miniWatchEffect(() => seen.push(double.value))
    count.value = 2
    expect(seen).toEqual([2, 4])
  })

  it('se chaîne : un computed peut lire un autre computed', () => {
    const count = miniRef(1)
    const double = miniComputed(() => count.value * 2)
    const quadruple = miniComputed(() => double.value * 2)
    const seen: number[] = []
    miniWatchEffect(() => seen.push(quadruple.value))
    count.value = 5
    expect(seen).toEqual([4, 20])
  })
})

describe('bonus — miniReactive (Proxy)', () => {
  it('suit les lectures et les écritures de propriétés, y compris imbriquées', () => {
    const state = miniReactive({ user: { name: 'Ada' }, count: 0 })
    const seen: string[] = []
    miniWatchEffect(() => seen.push(`${state.user.name}:${state.count}`))
    state.count = 1
    state.user.name = 'Grace'
    expect(seen).toEqual(['Ada:0', 'Ada:1', 'Grace:1'])
  })
})
