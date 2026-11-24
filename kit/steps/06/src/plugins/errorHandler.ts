/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { App } from 'vue'
import type { NotifyApi } from './notify'

/**
 * TODO — Le dernier filet : une erreur qu'AUCUNE frontière n'a attrapée arrive ici.
 * Rendez un gestionnaire `(error, instance, info) => void` qui :
 *  - journalise avec `console.error(`[app] erreur non gérée (${info})`, error)` ;
 *  - prévient l'utilisateur : `notify.notify('Une erreur inattendue est survenue.', 'error')`.
 */
export function createErrorHandler(
  notify: Pick<NotifyApi, 'notify'>,
): NonNullable<App['config']['errorHandler']> {
  throw new Error('À écrire')
}

/** TODO — Branche `createErrorHandler(notify)` sur `app.config.errorHandler`. */
export function installErrorHandler(app: App, notify: Pick<NotifyApi, 'notify'>) {
  throw new Error('À écrire')
}
