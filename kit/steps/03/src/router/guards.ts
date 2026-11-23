/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { NavigationGuard } from 'vue-router'

/**
 * TODO — Garde globale (router.beforeEach), à brancher dans router/index.ts.
 *  - route avec `to.meta.requiresAuth` et sans session : redirection vers
 *    `{ name: 'login', query: { redirect: to.fullPath } }` ;
 *  - route `login` avec une session ouverte : redirection vers `{ name: 'home' }` ;
 *  - sinon `true`.
 * `isAuthenticated` est une fonction : la session est relue à CHAQUE navigation.
 */
export function createAuthGuard(isAuthenticated: () => boolean): NavigationGuard {
  throw new Error('À écrire')
}
