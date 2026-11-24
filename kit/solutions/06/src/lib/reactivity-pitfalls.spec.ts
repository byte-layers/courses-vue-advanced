import { describe, expect, it } from 'vitest'
import { isReactive, nextTick, reactive, watchEffect } from 'vue'
import { attachEngine, useCounterState, useRawList } from './reactivity-pitfalls'

describe('piège du destructuring (toRefs)', () => {
  it('un destructuring direct fige la valeur ; useCounterState la garde réactive', async () => {
    // Le piège : on copie un nombre, plus aucun lien avec l'état.
    const state = reactive({ count: 0 })
    const { count: frozen } = state
    state.count++
    expect(frozen).toBe(0)

    // La parade : des refs, qu'on peut destructurer sans rien perdre.
    const { count, step, increment } = useCounterState(0)
    const seen: number[] = []
    watchEffect(() => seen.push(count.value))
    increment()
    step.value = 10
    increment()
    await nextTick()
    expect(count.value).toBe(11)
    expect(seen[seen.length - 1]).toBe(11)
  })
})

describe('shallowRef (useRawList)', () => {
  it('ne rend pas les éléments réactifs, mais notifie quand on remplace la liste', async () => {
    const { list, append } = useRawList([{ id: 1 }])
    expect(isReactive(list.value[0])).toBe(false)
    const lengths: number[] = []
    watchEffect(() => lengths.push(list.value.length))
    append({ id: 2 })
    await nextTick()
    expect(lengths).toEqual([1, 2])
  })

  it('une mutation en place ne notifie pas : il faut refresh() (triggerRef)', async () => {
    const { list, refresh } = useRawList<{ id: number }>([])
    const lengths: number[] = []
    watchEffect(() => lengths.push(list.value.length))
    list.value.push({ id: 1 }) // mutation en place : invisible pour Vue
    await nextTick()
    expect(lengths).toEqual([0])
    refresh()
    await nextTick()
    expect(lengths).toEqual([0, 1])
  })
})

describe('markRaw (attachEngine)', () => {
  class Engine {
    draws = 0
    draw() {
      this.draws++
    }
  }

  it('range le moteur dans un état réactif sans le proxifier', () => {
    const state = reactive<{ engine: Engine | null }>({ engine: null })
    const engine = new Engine()
    attachEngine(state, engine)
    expect(state.engine).toBe(engine) // la même référence, pas un Proxy
    expect(isReactive(state.engine)).toBe(false)
  })
})
