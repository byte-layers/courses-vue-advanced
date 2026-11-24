import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createErrorHandler, installErrorHandler } from './errorHandler'

afterEach(() => vi.restoreAllMocks())

describe('errorHandler (app.config.errorHandler)', () => {
  it('journalise l’erreur et prévient l’utilisateur', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const notify = { notify: vi.fn() }
    const handler = createErrorHandler(notify)
    const error = new Error('boum')
    handler(error, null, 'setup function')
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('setup function'), error)
    expect(notify.notify).toHaveBeenCalledWith('Une erreur inattendue est survenue.', 'error')
  })

  it('installErrorHandler branche le gestionnaire sur l’application', () => {
    const app = createApp({ render: () => null })
    expect(app.config.errorHandler).toBeUndefined()
    installErrorHandler(app, { notify: vi.fn() })
    expect(app.config.errorHandler).toBeTypeOf('function')
  })

  it('une erreur levée dans un composant, sans frontière, arrive au gestionnaire', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const notify = { notify: vi.fn() }
    const Broken = defineComponent({
      setup() {
        throw new Error('rendu impossible')
      },
    })
    const app = createApp({ render: () => h(Broken) })
    installErrorHandler(app, notify)
    app.mount(document.createElement('div'))
    expect(notify.notify).toHaveBeenCalledTimes(1)
    expect(notify.notify).toHaveBeenCalledWith('Une erreur inattendue est survenue.', 'error')
  })
})
