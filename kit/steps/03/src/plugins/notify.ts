/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { InjectionKey, Plugin } from 'vue'

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

/**
 * TODO 1 — Crée le plugin : `app.use(createNotify())` met l'API à disposition de toute l'application.
 *  - un état réactif (`reactive({ queue: [] })`) et un compteur d'identifiants ;
 *  - `api.queue` lit l'état ; `notify` ajoute (type « info », 4000 ms par défaut) et renvoie l'id ;
 *    `dismiss` retire par id ;
 *  - `install(app)` fait `app.provide(notifyKey, api)` ;
 *  - le plugin expose aussi `api`, pour s'en servir hors composant (garde de routeur, intercepteur...).
 */
export function createNotify(): NotifyPlugin {
  throw new Error('À écrire')
}

/**
 * TODO 2 — À appeler dans setup() : `inject(notifyKey)`, ou une erreur claire (qui cite `createNotify`)
 * si le plugin n'est pas installé.
 */
export function useNotify(): NotifyApi {
  throw new Error('À écrire')
}
