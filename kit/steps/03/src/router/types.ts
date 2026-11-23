import 'vue-router'

// Types des métadonnées de route : `meta.requiresAuth` est connu de TypeScript.
declare module 'vue-router' {
  interface RouteMeta {
    /** La route exige une session ouverte. */
    requiresAuth?: boolean
  }
}
