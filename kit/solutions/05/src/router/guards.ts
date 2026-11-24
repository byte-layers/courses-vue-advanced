import type { NavigationGuard } from 'vue-router'

/**
 * Garde globale (router.beforeEach).
 * - route `meta.requiresAuth` sans session : redirection vers /login?redirect=<adresse demandée> ;
 * - /login avec une session ouverte : retour à l'accueil.
 */
export function createAuthGuard(isAuthenticated: () => boolean): NavigationGuard {
  return (to) => {
    if (to.meta.requiresAuth && !isAuthenticated()) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.name === 'login' && isAuthenticated()) return { name: 'home' }
    return true
  }
}
