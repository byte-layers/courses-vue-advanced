import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, watchEffect } from 'vue'
import { mount } from '@vue/test-utils'
import { createNotify, notifyKey, useNotify, type NotifyApi } from './notify'

describe('plugin de notifications', () => {
  it('met l’API à disposition de toute l’application via provide (clé typée)', () => {
    const plugin = createNotify()
    let used: NotifyApi | undefined
    const Comp = defineComponent({
      setup() {
        used = useNotify()
        return () => h('div')
      },
    })
    const wrapper = mount(Comp, { global: { plugins: [plugin] } })
    expect(used).toBe(plugin.api)
    expect(wrapper.vm.$.appContext.provides[notifyKey as symbol]).toBe(plugin.api)
  })

  it('range les messages dans une file, dans l’ordre', () => {
    const { api } = createNotify()
    api.notify('un')
    api.notify('deux', 'error')
    expect(api.queue.map((n) => n.message)).toEqual(['un', 'deux'])
    expect(api.queue[1]?.kind).toBe('error')
  })

  it('utilise « info » et 4000 ms par défaut', () => {
    const { api } = createNotify()
    api.notify('salut')
    expect(api.queue[0]).toMatchObject({ kind: 'info', timeout: 4000 })
  })

  it('dismiss retire un message ; les identifiants sont uniques', () => {
    const { api } = createNotify()
    const a = api.notify('a')
    const b = api.notify('b')
    expect(a).not.toBe(b)
    api.dismiss(a)
    expect(api.queue.map((n) => n.message)).toEqual(['b'])
  })

  it('est réactive : un effet qui lit la file est relancé', async () => {
    const { api } = createNotify()
    const heads: (string | undefined)[] = []
    watchEffect(() => heads.push(api.queue[0]?.message))
    api.notify('premier')
    await nextTick()
    expect(heads).toEqual([undefined, 'premier'])
  })

  it('useNotify échoue avec un message clair si le plugin n’est pas installé', () => {
    const Comp = defineComponent({
      setup() {
        useNotify()
        return () => h('div')
      },
    })
    expect(() => mount(Comp)).toThrow(/createNotify/)
  })
})
