import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import ErrorBoundary from './ErrorBoundary.vue'

const Broken = defineComponent({
  setup() {
    throw new Error('rendu impossible')
  },
})

/** Un enfant qui plante ou non selon `shouldFail`. */
function makeChild(shouldFail: { value: boolean }) {
  return defineComponent({
    setup() {
      if (shouldFail.value) throw new Error('rendu impossible')
      return () => h('p', { 'data-testid': 'child' }, 'tout va bien')
    },
  })
}

// Le message de repli s'affiche au rendu SUIVANT (l'erreur change l'état de la frontière) : on attend.
async function mountBoundary(child: unknown, props: Record<string, unknown> = {}, slots = {}) {
  const wrapper = mount(ErrorBoundary, {
    props,
    slots: { default: () => h(child as never), ...slots },
    global: { plugins: [vuetify], config: { errorHandler: vi.fn() } },
  })
  await flushPromises()
  return wrapper
}

describe('ErrorBoundary (onErrorCaptured)', () => {
  it('sans erreur : affiche son contenu', async () => {
    const fail = ref(false)
    const wrapper = await mountBoundary(makeChild(fail))
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(false)
  })

  it('un descendant qui plante : la frontière affiche un message à sa place', async () => {
    const wrapper = await mountBoundary(Broken)
    expect(wrapper.find('[data-testid="error-boundary"]').text()).toContain('rendu impossible')
    expect(wrapper.find('[data-testid="error-boundary"]').attributes('role')).toBe('alert')
  })

  it('l’erreur ne remonte PAS à app.config.errorHandler (onErrorCaptured renvoie false)', async () => {
    const errorHandler = vi.fn()
    mount(ErrorBoundary, {
      slots: { default: () => h(Broken) },
      global: { plugins: [vuetify], config: { errorHandler } },
    })
    await flushPromises()
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('émet « error » avec l’erreur et le lieu où elle est survenue', async () => {
    const wrapper = await mountBoundary(Broken)
    const [error, info] = wrapper.emitted<[Error, string]>('error')![0]!
    expect(error.message).toBe('rendu impossible')
    expect(info).toEqual(expect.any(String))
  })

  it('« Réessayer » réarme la frontière : le contenu est rendu de nouveau', async () => {
    const fail = ref(true)
    const wrapper = await mountBoundary(makeChild(fail))
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(true)
    fail.value = false // le problème est réglé
    await wrapper.get('[data-testid="error-boundary-retry"]').trigger('click')
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(false)
  })

  it('un changement de resetKey (la route) réarme la frontière', async () => {
    const fail = ref(true)
    const wrapper = await mountBoundary(makeChild(fail), { resetKey: '/a' })
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(true)
    fail.value = false
    await wrapper.setProps({ resetKey: '/b' })
    await nextTick()
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
  })

  it('le slot « fallback » remplace le message par défaut et reçoit error et reset', async () => {
    const wrapper = await mountBoundary(
      Broken,
      {},
      {
        fallback: ({ error }: { error: Error }) => h('div', { 'data-testid': 'mine' }, `Oups : ${error.message}`),
      },
    )
    expect(wrapper.find('[data-testid="mine"]').text()).toBe('Oups : rendu impossible')
    expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(false)
  })

  it('attrape aussi une erreur levée dans un gestionnaire d’événement d’un descendant', async () => {
    const Clicker = defineComponent({
      setup: () => () =>
        h('button', {
          'data-testid': 'boom',
          onClick: () => {
            throw new Error('clic fatal')
          },
        }),
    })
    const wrapper = await mountBoundary(Clicker)
    await wrapper.get('[data-testid="boom"]').trigger('click')
    expect(wrapper.find('[data-testid="error-boundary"]').text()).toContain('clic fatal')
  })
})
