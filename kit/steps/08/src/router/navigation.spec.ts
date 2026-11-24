import { describe, it } from 'vitest'
// À écrire : tests de navigation, avec le VRAI routeur et sa garde (`createAppRouter(createMemoryHistory())`).
//
// Outils : `router.push(path)` puis `await flushPromises()` (de '@vue/test-utils') puis `router.currentRoute.value`
// (`name`, `fullPath`, `query`). La session se pose dans le store d'authentification :
// `setActivePinia(createPinia())`, `useAuthStore().session = { accessToken, refreshToken, user }` (et `localStorage.clear()`).
describe('navigation', () => {
  it.todo('« / » redirige vers /home')
  it.todo('une page publique est accessible sans session')
  it.todo('/account sans session : redirection vers /login avec l’adresse demandée (query.redirect)')
  it.todo('/checkout sans session : bloqué, retour prévu vers /checkout')
  it.todo('avec une session, /account est accessible')
  it.todo('avec une session, /login renvoie à l’accueil')
  it.todo('la garde relit la session à chaque navigation (déconnexion puis /account)')
  it.todo('/products/42 : route « product », paramètre id')
  it.todo('/products/abc : page introuvable (l’id doit être numérique)')
  it.todo('une adresse inconnue mène à la page 404')
})
