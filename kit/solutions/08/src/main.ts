import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { createNotify } from './plugins/notify'
import { installErrorHandler } from './plugins/errorHandler'
import { vCountdown } from './directives/countdown'
import { useAuthStore } from './features/auth/authStore'

const app = createApp(App)
const pinia = createPinia()
const notify = createNotify()
// Le cache serveur : un QueryClient partagé, installé comme un plugin.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

app.use(pinia).use(VueQueryPlugin, { queryClient }).use(vuetify).use(notify).use(router)
app.directive('countdown', vCountdown)
// Dernier filet : toute erreur qu'aucune frontière n'a attrapée est journalisée et signalée.
installErrorHandler(app, notify.api)

// Session perdue (renouvellement impossible) : on prévient et on renvoie vers la connexion.
useAuthStore(pinia).onSessionExpired(() => {
  notify.api.notify('Session expirée, reconnectez-vous.', 'error')
  void router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
})

app.mount('#app')
