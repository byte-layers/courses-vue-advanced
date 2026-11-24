import { inject, reactive, type InjectionKey, type Plugin } from 'vue'

export type NotifyKind = 'info' | 'success' | 'error'

export interface Notification {
  id: number
  message: string
  kind: NotifyKind
  /** Durée d'affichage en ms. */
  timeout: number
}

export interface NotifyApi {
  /** File d'attente : la première est affichée, les autres patientent. */
  readonly queue: readonly Notification[]
  notify(message: string, kind?: NotifyKind, timeout?: number): number
  dismiss(id: number): void
}

/** Clé d'injection TYPÉE : `inject(notifyKey)` est un NotifyApi | undefined, pas un `unknown`. */
export const notifyKey: InjectionKey<NotifyApi> = Symbol('notify')

export type NotifyPlugin = Plugin & { api: NotifyApi }

/** Crée le plugin : `app.use(createNotify())` met l'API à disposition de toute l'application. */
export function createNotify(): NotifyPlugin {
  let nextId = 1
  const state = reactive<{ queue: Notification[] }>({ queue: [] })

  const api: NotifyApi = {
    get queue() {
      return state.queue
    },
    notify(message, kind = 'info', timeout = 4000) {
      const id = nextId++
      state.queue.push({ id, message, kind, timeout })
      return id
    },
    dismiss(id) {
      state.queue = state.queue.filter((n) => n.id !== id)
    },
  }

  return {
    api, // utilisable hors composant (garde de routeur, intercepteur...)
    install(app) {
      app.provide(notifyKey, api)
    },
  }
}

/** À appeler dans setup() : récupère l'API ou échoue avec un message clair. */
export function useNotify(): NotifyApi {
  const api = inject(notifyKey)
  if (!api)
    throw new Error('Le plugin de notifications n’est pas installé : app.use(createNotify())')
  return api
}
