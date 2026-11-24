import type { App } from 'vue'
import type { NotifyApi } from './notify'

/**
 * Le dernier filet : une erreur que AUCUNE frontière n'a attrapée (hors d'un `ErrorBoundary`,
 * ou renvoyée par lui) arrive ici. On la journalise et on prévient l'utilisateur.
 */
export function createErrorHandler(notify: Pick<NotifyApi, 'notify'>): NonNullable<App['config']['errorHandler']> {
  return (error, _instance, info) => {
    console.error(`[app] erreur non gérée (${info})`, error)
    notify.notify('Une erreur inattendue est survenue.', 'error')
  }
}

export function installErrorHandler(app: App, notify: Pick<NotifyApi, 'notify'>) {
  app.config.errorHandler = createErrorHandler(notify)
}
